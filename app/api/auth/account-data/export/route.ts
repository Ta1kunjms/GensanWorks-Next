import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { safeDatabaseOperation } from "@/lib/api-errors";
import { omitSecrets } from "@/lib/profile-secrets";
import { isUuid } from "@/lib/postgrest-safe";

type SupportedRole = "admin" | "employer" | "jobseeker";

function isSupportedRole(role: string): role is SupportedRole {
  return role === "admin" || role === "employer" || role === "jobseeker";
}

// Column lists follow the live schema (2026-10-21 scan). A data-subject export
// includes the person's own profile, minus credentials.
const APPLICATION_COLUMNS =
  "id, job_id, employer_id, jobseeker_id, status, source, match_score, submitted_at, reviewed_at, interview_date, created_at, updated_at";
const REFERRAL_COLUMNS = "id, job_id, employer_id, jobseeker_id, application_id, status, date_referred, created_at, updated_at";
const MESSAGE_COLUMNS = "id, sender_id, recipient_id, content, read, created_at";
const NOTIFICATION_COLUMNS = "id, role, type, title, message, related_id, related_type, read, is_read, created_at";
const DELETION_COLUMNS = "id, status, reason, requested_at, delete_after, processed_at, created_at, updated_at";

type QueryResult = { data: unknown; error: { code?: string } | null };

/** Rows of a list query; a failed section fails the export instead of returning silently empty. */
function rowsOf(result: QueryResult, section: string): Array<Record<string, unknown>> {
  if (result.error) throw new Error(`account export: ${section} query failed (${result.error.code ?? "unknown"})`);
  return (result.data as Array<Record<string, unknown>> | null) ?? [];
}

function sharedSections(userId: string, role: SupportedRole) {
  return Promise.all([
    supabaseAdmin
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("account_deletion_requests")
      .select(DELETION_COLUMNS)
      .eq("role", role)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
}

async function exportJobseekerData(userId: string) {
  const profileResult = await supabaseAdmin.from("jobseekers").select("*").eq("id", userId).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) return null;

  const childTables = [
    "jobseeker_education",
    "jobseeker_experience",
    "jobseeker_languages",
    "jobseeker_licenses",
    "jobseeker_trainings",
  ] as const;

  const [childResults, applicationsResult, bookmarksResult, referralsResult, slipsResult, shared] = await Promise.all([
    Promise.all(childTables.map((table) => supabaseAdmin.from(table).select("*").eq("jobseeker_id", userId))),
    supabaseAdmin
      .from("applications")
      .select(APPLICATION_COLUMNS)
      .eq("jobseeker_id", userId)
      .order("submitted_at", { ascending: false }),
    supabaseAdmin
      .from("jobseeker_saved_jobs")
      .select("id, job_id, created_at")
      .eq("jobseeker_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("referrals")
      .select(REFERRAL_COLUMNS)
      .eq("jobseeker_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("referral_slips")
      .select("id, slip_number, job_id, issued_at, valid_until, status, created_at")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false }),
    sharedSections(userId, "jobseeker"),
  ]);

  const [messagesResult, notificationsResult, deletionResult] = shared;
  const [education, experience, languages, licenses, trainings] = childResults.map((result, i) =>
    rowsOf(result, childTables[i] ?? "profile details")
  );

  return {
    profile: omitSecrets(profileResult.data as Record<string, unknown>),
    education,
    experience,
    languages,
    licenses,
    trainings,
    applications: rowsOf(applicationsResult, "applications"),
    bookmarks: rowsOf(bookmarksResult, "saved jobs"),
    referrals: rowsOf(referralsResult, "referrals"),
    referralSlips: rowsOf(slipsResult, "referral slips"),
    messages: rowsOf(messagesResult, "messages"),
    notifications: rowsOf(notificationsResult, "notifications"),
    accountDeletionRequests: rowsOf(deletionResult, "deletion requests"),
  };
}

async function exportEmployerData(employerId: string) {
  const profileResult = await supabaseAdmin.from("employers").select("*").eq("id", employerId).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) return null;

  const [jobsResult, applicationsResult, referralsResult, shared] = await Promise.all([
    supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, description, location, work_setup, work_type, starting_salary, salary_min, salary_max, job_status, is_active, archived, vacancies, created_at, updated_at"
      )
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("applications")
      .select(APPLICATION_COLUMNS)
      .eq("employer_id", employerId)
      .order("submitted_at", { ascending: false }),
    supabaseAdmin
      .from("referrals")
      .select(REFERRAL_COLUMNS)
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    sharedSections(employerId, "employer"),
  ]);

  const [messagesResult, notificationsResult, deletionResult] = shared;

  return {
    profile: omitSecrets(profileResult.data as Record<string, unknown>),
    jobs: rowsOf(jobsResult, "jobs"),
    applications: rowsOf(applicationsResult, "applications"),
    referrals: rowsOf(referralsResult, "referrals"),
    messages: rowsOf(messagesResult, "messages"),
    notifications: rowsOf(notificationsResult, "notifications"),
    accountDeletionRequests: rowsOf(deletionResult, "deletion requests"),
  };
}

async function exportAdminData(adminId: string) {
  const profileResult = await supabaseAdmin
    .from("admins")
    .select("id, email, name, role, is_active, last_login, created_at, updated_at")
    .eq("id", adminId)
    .maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) return null;

  const [messagesResult, notificationsResult, deletionResult] = await sharedSections(adminId, "admin");

  return {
    profile: profileResult.data,
    messages: rowsOf(messagesResult, "messages"),
    notifications: rowsOf(notificationsResult, "notifications"),
    accountDeletionRequests: rowsOf(deletionResult, "deletion requests"),
  };
}

const accountExportBuilders: Record<SupportedRole, (userId: string) => Promise<unknown>> = {
  admin: exportAdminData,
  employer: exportEmployerData,
  jobseeker: exportJobseekerData,
};

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || !user.role || !isSupportedRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    if (!isUuid(user.id)) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const result = await safeDatabaseOperation(
      () => accountExportBuilders[user.role as SupportedRole](user.id!),
      `exportAccountData(${user.role}, ${user.id})`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Internal server error", requestId },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json({ error: "Account not found", requestId }, { status: 404 });
    }

    const exportedAt = new Date().toISOString();
    const response = NextResponse.json(
      {
        role: user.role,
        exportedAt,
        account: result.data,
        requestId,
      },
      { status: 200 }
    );

    const dateStamp = exportedAt.slice(0, 10);
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="gensanworks-account-export-${user.role}-${dateStamp}.json"`
    );
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Account data export error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}