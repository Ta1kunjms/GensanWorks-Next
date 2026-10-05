export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Task 13O: Direct Auth-user deletion is deliberately disabled.
// Raw hard-deletion of user accounts via Supabase Admin API violates database
// foreign-key RESTRICT constraints on related records and bypasses the approved
// deactivate-then-anonymize lifecycle workflow. Direct deletion remains disabled
// pending the implementation of the approved lifecycle workflow.
export async function DELETE() {
  return NextResponse.json(
    { error: "Account deletion is not available." },
    { status: 501 }
  );
}
