import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveProfileRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Google sign-in is not offered during the pilot; this callback stays only as a
// deny-by-default request-intake path. Administrator access is granted solely by an
// existing, active admins profile for the verified Auth user id (resolveProfileRole);
// this route never creates an admins row and never treats an access request as
// authorization. Every non-admin session is signed out before redirecting.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const adminLogin = (params: Record<string, string>) =>
    NextResponse.redirect(`${origin}/login/admin?${new URLSearchParams(params).toString()}`);

  if (!code) return adminLogin({ error: "oauth_failed" });

  const supabase = await createClient();
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !data.user) {
    console.error("[admin-callback] OAuth session exchange failed.");
    return adminLogin({ error: "oauth_failed" });
  }

  const { user } = data;

  // Only an existing, active, unambiguous admins profile for this verified user id.
  if ((await resolveProfileRole(user.id)) === "admin") {
    return NextResponse.redirect(`${origin}/admin/dashboard`);
  }

  // Not an administrator: never keep this session.
  await supabase.auth.signOut().catch(() => undefined);

  const userEmail = user.email?.toLowerCase().trim() ?? "";
  if (!userEmail) return adminLogin({ error: "no_email" });

  const { data: existingRequest, error: requestError } = await supabaseAdmin
    .from("admin_access_requests")
    .select("id, status")
    .eq("email", userEmail)
    .maybeSingle();

  if (requestError) {
    console.error("[admin-callback] Access request lookup failed.");
    return adminLogin({ error: "request_failed" });
  }

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      return adminLogin({ pending_approval: "1", email: userEmail });
    }
    if (existingRequest.status === "rejected") {
      return adminLogin({ error: "access_rejected" });
    }
    // Approved (or any other status) without an active admins profile: the request
    // is left unchanged and no approval or access is implied.
    return adminLogin({ error: "access_not_active" });
  }

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0];

  const { error: insertError } = await supabaseAdmin.from("admin_access_requests").insert({
    name: userName,
    email: userEmail,
    phone: user.phone ?? "",
    organization: "Google OAuth",
    notes: "Submitted via Google OAuth sign-in",
    status: "pending",
  });

  if (insertError) {
    console.error("[admin-callback] Access request intake failed.");
    return adminLogin({ error: "request_failed" });
  }

  return adminLogin({ pending_approval: "1", email: userEmail });
}
