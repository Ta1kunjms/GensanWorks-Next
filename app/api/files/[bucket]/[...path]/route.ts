export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import {
  SIGNED_URL_TTL_SECONDS,
  canAccessPrivateFile,
  isPrivateFileBucket,
  parsePrivateFilePath,
} from "@/lib/private-files";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** True when the employer has an application from, or messages with, the jobseeker. */
async function employerLinkedToJobseeker(employerId: string, jobseekerId: string): Promise<boolean> {
  const [applications, messages] = await Promise.all([
    supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", employerId)
      .eq("jobseeker_id", jobseekerId),
    supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .or(
        `and(sender_id.eq.${employerId},recipient_id.eq.${jobseekerId}),` +
          `and(sender_id.eq.${jobseekerId},recipient_id.eq.${employerId})`
      ),
  ]);
  return (applications.count ?? 0) > 0 || (messages.count ?? 0) > 0;
}

/**
 * Opens a file from a private storage bucket. Checks who is asking, then
 * redirects to a signed URL that expires after SIGNED_URL_TTL_SECONDS.
 * Unknown and forbidden files both return 404 so file names are not confirmed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  const requestId = getRequestId(req);
  const notFound = () =>
    NextResponse.json({ error: "File not found", requestId }, { status: 404, headers: NO_STORE });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: NO_STORE });
    }

    const { bucket, path: segments } = await params;
    if (!isPrivateFileBucket(bucket)) return notFound();

    // Upload paths only use [A-Za-z0-9._-], so segments are matched as-is.
    const parsed = parsePrivateFilePath(segments);
    if (!parsed) return notFound();

    const needsLink = user.role === "employer" && user.id !== parsed.ownerId;
    const allowed = canAccessPrivateFile({
      viewerId: user.id,
      viewerRole: user.role,
      bucket,
      ownerId: parsed.ownerId,
      employerLinkedToOwner: needsLink ? await employerLinkedToJobseeker(user.id, parsed.ownerId) : false,
    });
    if (!allowed) return notFound();

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return notFound();

    const response = NextResponse.redirect(data.signedUrl, 302);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    console.error("Private file access error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, headers: NO_STORE });
  }
}
