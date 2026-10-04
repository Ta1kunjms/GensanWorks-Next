export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Task 13F: hard deletion of a role profile is deliberately disabled here.
// The selected account-lifecycle direction prohibits raw hard-delete of
// jobseeker/employer/admin profiles entirely; the approved design is
// deactivate first, then anonymize, under a separate, dedicated
// deactivation/anonymization workflow task that has not been implemented
// yet. This handler makes no Supabase client call, no network call, and
// no database action of any kind — it only returns a fixed 501 response.
// Do not restore direct profile deletion in this route; a future task
// must replace this with a call into the approved deactivation workflow
// once it exists.
export async function DELETE() {
  return NextResponse.json(
    { error: "Account deletion is not available." },
    { status: 501 }
  );
}