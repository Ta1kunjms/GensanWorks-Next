import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Retired: administrators sign in only with email and password at /login/admin
// (owner decision 2026-10-20). This former Google admin callback must never
// complete a session, so any request is signed out and sent to the admin login.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
  return NextResponse.redirect(`${origin}/login/admin?error=google_not_supported`);
}
