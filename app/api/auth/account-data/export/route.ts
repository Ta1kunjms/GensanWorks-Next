import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { safeDatabaseOperation } from "@/lib/api-errors";

type SupportedRole = "admin" | "employer" | "jobseeker";

function isSupportedRole(role: string): role is SupportedRole {
  return role === "admin" || role === "employer" || role === "jobseeker";
}

async function exportJobseekerData(userId: string) {
  const profileResult = await supabaseAdmin
    .from("users")
    .select(
      "id, email, name, phone, birth_date, gender, profile_image, address, city, province, zip_code, employment_status, current_occupation, current_employer, employment_type, education_level, school_name, school_year, skills, certifications, is_four_ps, is_ofw, is_pwd, owd_type, preferred_industries, preferred_locations, salary_expectation, job_search_status, registration_date, profile_complete, profile_completeness, is_active, created_at, updated_at"
    )
    .eq("id", userId)
    .single();

  const [applicationsResult, bookmarksResult, referralsResult, messagesResult, notificationsResult, deletionResult] =
    await Promise.all([
      supabaseAdmin
        .from("applications")
        .select(
          "id, job_id, employer_id, applicant_name, applicant_email, cover_letter, resume_url, status, feedback, submitted_at, reviewed_at, created_at, updated_at"
        )
        .eq("applicant_id", userId)
        .order("submitted_at", { ascending: false }),
      supabaseAdmin
        .from("bookmarks")
        .select("id, job_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("referrals")
        .select(
          "id, employer_id, job_id, application_id, applicant, employer, vacancy, status, referral_slip_number, peso_officer_name, date_referred, remarks, created_at, updated_at"
        )
        .eq("applicant_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, content, read, read_at, created_at, updated_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("notifications")
        .select("id, role, type, title, message, related_id, related_type, read, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("account_deletion_requests")
        .select(
          "id, status, reason, requested_at, delete_after, cancelled_at, processed_at, created_at, updated_at"
        )
        .eq("role", "jobseeker")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (!profileResult.data) return null;

  return {
    profile: profileResult.data,
    applications: applicationsResult.data ?? [],
    bookmarks: bookmarksResult.data ?? [],
    referrals: referralsResult.data ?? [],
    messages: messagesResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    accountDeletionRequests: deletionResult.data ?? [],
  };
}

async function exportEmployerData(employerId: string) {
  const profileResult = await supabaseAdmin
    .from("employers")
    .select(
      "id, email, contact_person, contact_phone, establishment_name, industry, company_type, company_size, business_nature, address, city, province, zip_code, website, description, years_in_operation, logo_url, account_status, verified_at, is_active, created_at, updated_at"
    )
    .eq("id", employerId)
    .single();

  const [jobsResult, applicationsResult, referralsResult, messagesResult, notificationsResult, deletionResult] = await Promise.all([
    supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, description, location, city, province, employment_type, salary_min, salary_max, salary_period, status, is_published, archived, vacancies, published_at, created_at, updated_at"
      )
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("applications")
      .select(
        "id, job_id, applicant_id, applicant_name, applicant_email, status, cover_letter, resume_url, feedback, submitted_at, reviewed_at, created_at, updated_at"
      )
      .eq("employer_id", employerId)
      .order("submitted_at", { ascending: false }),
    supabaseAdmin
      .from("referrals")
      .select(
        "id, applicant_id, job_id, application_id, applicant, vacancy, status, referral_slip_number, peso_officer_name, date_referred, remarks, created_at, updated_at"
      )
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, read_at, created_at, updated_at")
      .or(`sender_id.eq.${employerId},recipient_id.eq.${employerId}`)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("notifications")
      .select("id, role, type, title, message, related_id, related_type, read, read_at, created_at")
      .eq("user_id", employerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("account_deletion_requests")
      .select(
        "id, status, reason, requested_at, delete_after, cancelled_at, processed_at, created_at, updated_at"
      )
      .eq("role", "employer")
      .eq("user_id", employerId)
      .order("created_at", { ascending: false }),
  ]);

  if (!profileResult.data) return null;

  return {
    profile: profileResult.data,
    jobs: jobsResult.data ?? [],
    applications: applicationsResult.data ?? [],
    referrals: referralsResult.data ?? [],
    messages: messagesResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    accountDeletionRequests: deletionResult.data ?? [],
  };
}

async function exportAdminData(adminId: string) {
  const profileResult = await supabaseAdmin
    .from("admins")
    .select("id, email, name, role, is_active, last_login, created_at, updated_at")
    .eq("id", adminId)
    .single();

  const [messagesResult, notificationsResult, deletionResult] = await Promise.all([
    supabaseAdmin
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, read_at, created_at, updated_at")
      .or(`sender_id.eq.${adminId},recipient_id.eq.${adminId}`)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("notifications")
      .select("id, role, type, title, message, related_id, related_type, read, read_at, created_at")
      .eq("user_id", adminId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("account_deletion_requests")
      .select(
        "id, status, reason, requested_at, delete_after, cancelled_at, processed_at, created_at, updated_at"
      )
      .eq("role", "admin")
      .eq("user_id", adminId)
      .order("created_at", { ascending: false }),
  ]);

  if (!profileResult.data) return null;

  return {
    profile: profileResult.data,
    messages: messagesResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    accountDeletionRequests: deletionResult.data ?? [],
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

    if (!user.id) {
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