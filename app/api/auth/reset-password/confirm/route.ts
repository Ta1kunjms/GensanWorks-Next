export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Task 13O: Self-service password reset confirmation is deliberately disabled.
// The previous implementation updated legacy profile-table credentials
// rather than Supabase Auth credentials (auth.users), which login actually validates.
// This route is disabled until a future approved task aligns self-service reset
// with Supabase Auth credentials.
//
// Reference role-to-table map (Task 13F):
// admin: "admins",
// employer: "employers",
// jobseeker: "jobseekers",
export async function POST() {
  return NextResponse.json(
    { error: "Password changes are temporarily unavailable." },
    { status: 501 }
  );
}