import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !data.user) {
      console.error("OAuth session error:", sessionError);
      return NextResponse.redirect(`${origin}/login/admin?error=oauth_failed`);
    }

    const { user } = data;
    const userEmail = user.email?.toLowerCase().trim() ?? "";

    if (!userEmail) {
      return NextResponse.redirect(`${origin}/login/admin?error=no_email`);
    }

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id, email")
      .eq("email", userEmail)
      .single();

    if (!adminError && adminData) {
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    }

    const { data: existingRequest, error: requestError } = await supabaseAdmin
      .from("admin_access_requests")
      .select("id, status, email")
      .eq("email", userEmail)
      .single();

    if (!requestError && existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.redirect(
          `${origin}/login/admin?pending_approval=1&email=${encodeURIComponent(userEmail)}`
        );
      }
      if (existingRequest.status === "approved") {
        await supabaseAdmin
          .from("admin_access_requests")
          .update({ status: "pending", reviewed_at: null })
          .eq("id", existingRequest.id);
        return NextResponse.redirect(
          `${origin}/login/admin?pending_approval=1&email=${encodeURIComponent(userEmail)}`
        );
      }
      if (existingRequest.status === "rejected") {
        return NextResponse.redirect(
          `${origin}/login/admin?error=access_rejected&email=${encodeURIComponent(userEmail)}`
        );
      }
    }

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      userEmail.split("@")[0];

    await supabaseAdmin.from("admin_access_requests").insert({
      name: userName,
      email: userEmail,
      phone: user.phone ?? "",
      organization: "Google OAuth",
      notes: "Submitted via Google OAuth sign-in",
      status: "pending",
    });

    return NextResponse.redirect(
      `${origin}/login/admin?pending_approval=1&email=${encodeURIComponent(userEmail)}`
    );
  }

  return NextResponse.redirect(`${origin}/login/admin?error=oauth_failed`);
}