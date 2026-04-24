import { supabaseAdmin } from "@/lib/supabase";

export type LegacyActivity = {
  id: string;
  type: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string | null;
  details: string;
  createdAt: string;
};

function iso(value: unknown) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  }
  return new Date().toISOString();
}

export async function buildLegacyActivities(limit: number) {
  const capped = Math.max(20, Math.min(500, limit));

  const [
    accessRequestsResult,
    deletionRequestsResult,
    jobsResult,
    applicationsResult,
    referralsResult,
    employersResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("admin_access_requests")
      .select("id, email, status, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(capped),
    supabaseAdmin
      .from("account_deletion_requests")
      .select("id, user_id, role, email, status, requested_at, processed_at, cancelled_at")
      .order("requested_at", { ascending: false })
      .limit(capped),
    supabaseAdmin
      .from("jobs")
      .select("id, employer_id, position_title, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(capped),
    supabaseAdmin
      .from("applications")
      .select("id, applicant_id, job_id, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(capped),
    supabaseAdmin
      .from("referrals")
      .select("id, applicant_id, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(capped),
    supabaseAdmin
      .from("employers")
      .select("id, created_at, updated_at, account_status")
      .order("updated_at", { ascending: false })
      .limit(capped),
  ]);

  const accessRequests = accessRequestsResult.data ?? [];
  const deletionRequests = deletionRequestsResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const applications = applicationsResult.data ?? [];
  const referrals = referralsResult.data ?? [];
  const employers = employersResult.data ?? [];

  const activities: LegacyActivity[] = [];

  accessRequests.forEach((item: Record<string, unknown>) => {
    activities.push({
      id: `access-create-${item.id}`,
      type: "admin_access_request_created",
      action: "create",
      resourceType: "admin_access_request",
      resourceId: String(item.id),
      userId: String(item.email),
      details: `Admin access request created (${item.status})`,
      createdAt: iso(item.created_at),
    });

    if (item.reviewed_at) {
      activities.push({
        id: `access-review-${item.id}`,
        type: "admin_access_request_reviewed",
        action: "update",
        resourceType: "admin_access_request",
        resourceId: String(item.id),
        userId: String(item.email),
        details: `Admin access request reviewed (${item.status})`,
        createdAt: iso(item.reviewed_at),
      });
    }
  });

  deletionRequests.forEach((item: Record<string, unknown>) => {
    activities.push({
      id: `deletion-request-${item.id}`,
      type: "account_deletion_requested",
      action: "create",
      resourceType: "account_deletion_request",
      resourceId: String(item.id),
      userId: item.user_id ? String(item.user_id) : null,
      details: `${item.role} account deletion requested (${item.status})`,
      createdAt: iso(item.requested_at),
    });

    if (item.processed_at) {
      activities.push({
        id: `deletion-processed-${item.id}`,
        type: "account_deletion_processed",
        action: "update",
        resourceType: "account_deletion_request",
        resourceId: String(item.id),
        userId: item.user_id ? String(item.user_id) : null,
        details: `Account deletion processed (${item.status})`,
        createdAt: iso(item.processed_at),
      });
    }

    if (item.cancelled_at) {
      activities.push({
        id: `deletion-cancelled-${item.id}`,
        type: "account_deletion_cancelled",
        action: "update",
        resourceType: "account_deletion_request",
        resourceId: String(item.id),
        userId: item.user_id ? String(item.user_id) : null,
        details: "Account deletion cancelled",
        createdAt: iso(item.cancelled_at),
      });
    }
  });

  jobs.forEach((item: Record<string, unknown>) => {
    activities.push({
      id: `job-update-${item.id}`,
      type: "job_updated",
      action: "update",
      resourceType: "job",
      resourceId: String(item.id),
      userId: item.employer_id ? String(item.employer_id) : null,
      details: `Job ${item.position_title} status=${item.status}`,
      createdAt: iso(item.updated_at),
    });
  });

  applications.forEach((item: Record<string, unknown>) => {
    activities.push({
      id: `application-update-${item.id}`,
      type: "application_updated",
      action: "update",
      resourceType: "application",
      resourceId: String(item.id),
      userId: item.applicant_id ? String(item.applicant_id) : null,
      details: `Application status=${item.status}`,
      createdAt: iso(item.updated_at),
    });
  });

  referrals.forEach((item: Record<string, unknown>) => {
    activities.push({
      id: `referral-update-${item.id}`,
      type: "referral_updated",
      action: "update",
      resourceType: "referral",
      resourceId: String(item.id),
      userId: item.applicant_id ? String(item.applicant_id) : null,
      details: `Referral status=${item.status}`,
      createdAt: iso(item.updated_at),
    });
  });

  employers.forEach((item: Record<string, unknown>) => {
    activities.push({
      id: `employer-update-${item.id}`,
      type: "employer_updated",
      action: "update",
      resourceType: "employer",
      resourceId: String(item.id),
      userId: String(item.id),
      details: `Employer account status=${item.account_status}`,
      createdAt: iso(item.updated_at),
    });
  });

  activities.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return activities;
}