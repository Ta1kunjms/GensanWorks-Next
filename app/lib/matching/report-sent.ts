import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";

// job_match_scores has no sent_to_employer/sent_at columns. Sending a matching
// report to an employer is recorded as an audit event on the job instead, which
// also keeps who sent it and when (human-in-control auditability).

export async function markMatchingReportSent(input: {
  jobId: string;
  employerId: string;
  adminId: string;
  scoredCount: number;
  req?: Request;
}): Promise<void> {
  await logAuditAction({
    userId: input.adminId,
    role: "admin",
    action: "matching_report_sent",
    resourceType: "job",
    resourceId: input.jobId,
    payload: { employerId: input.employerId, scoredCount: input.scoredCount },
    req: input.req,
  });
}

/** Map of jobId -> time the latest matching report was sent to the employer. */
export async function getMatchingReportSentAt(jobIds: string[]): Promise<Map<string, string>> {
  const sent = new Map<string, string>();
  if (jobIds.length === 0) return sent;
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("resource_id, created_at")
    .eq("action", "matching_report_sent")
    .eq("resource_type", "job")
    .in("resource_id", jobIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  for (const row of data ?? []) {
    const id = String(row.resource_id);
    if (!sent.has(id)) sent.set(id, String(row.created_at));
  }
  return sent;
}
