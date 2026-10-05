export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Task 13O: Authenticated password change is deliberately disabled.
// The previous implementation verified and updated legacy profile-table credentials
// rather than Supabase Auth credentials (auth.users), which login actually validates.
// This route is disabled until a future approved task aligns password changes
// with Supabase Auth credentials.
export async function POST() {
  return NextResponse.json(
    { error: "Password changes are temporarily unavailable." },
    { status: 501 }
  );
}
