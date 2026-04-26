export const dynamic = "force-dynamic";
import { ensureAdmin, readFormatFromUrl } from "@/lib/legacy-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { exportResponse } from "@/api/admin/export/_utils";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const format = readFormatFromUrl(req.url) ?? "csv";

    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const quarterStart = new Date(
      currentDate.getFullYear(),
      Math.floor(currentDate.getMonth() / 3) * 3,
      1
    );

    const [
      usersResult,
      employersResult,
      jobsResult,
      applicationsResult,
      referralsResult,
      hiredThisMonthResult,
      hiredThisQuarterResult,
    ] = await Promise.all([
      supabaseAdmin.from("users").select("id, created_at"),
      supabaseAdmin
        .from("employers")
        .select("id, establishment_name, industry, created_at"),
      supabaseAdmin
        .from("jobs")
        .select("id, position_title, employer_id, location, status, created_at"),
      supabaseAdmin.from("applications").select("id, status, created_at"),
      supabaseAdmin.from("referrals").select("id, status, created_at"),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Hired")
        .gte("created_at", monthStart.toISOString()),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Hired")
        .gte("created_at", quarterStart.toISOString()),
    ]);

    const totalJobSeekers = usersResult.data?.length ?? 0;
    const totalEmployers = employersResult.data?.length ?? 0;
    const totalJobs = jobsResult.data?.length ?? 0;
    const totalApplications = applicationsResult.data?.length ?? 0;
    const totalReferrals = referralsResult.data?.length ?? 0;
    const hiredThisMonth = hiredThisMonthResult.count ?? 0;
    const hiredThisQuarter = hiredThisQuarterResult.count ?? 0;

    const industryCounts: Record<string, number> = {};
    (employersResult.data ?? []).forEach((emp) => {
      const industry = (emp.industry as string) || "Unknown";
      industryCounts[industry] = (industryCounts[industry] ?? 0) + 1;
    });

    const jobStatusCounts: Record<string, number> = {};
    (jobsResult.data ?? []).forEach((job) => {
      jobStatusCounts[job.status as string] = (jobStatusCounts[job.status as string] ?? 0) + 1;
    });

    const applicationStatusCounts: Record<string, number> = {};
    (applicationsResult.data ?? []).forEach((app) => {
      applicationStatusCounts[app.status as string] =
        (applicationStatusCounts[app.status as string] ?? 0) + 1;
    });

    const referralStatusCounts: Record<string, number> = {};
    (referralsResult.data ?? []).forEach((ref) => {
      referralStatusCounts[ref.status as string] =
        (referralStatusCounts[ref.status as string] ?? 0) + 1;
    });

    const reportDate = currentDate.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    type ReportRow = Record<string, string | number>;

    const summaryRow: ReportRow = {
      report_type: "DOLE Statistical Report",
      reporting_period: reportDate,
      generated_by: "GensanWorks PESO Admin",
      total_job_seekers: totalJobSeekers,
      total_employers: totalEmployers,
      total_job_postings: totalJobs,
      total_applications: totalApplications,
      total_referrals: totalReferrals,
      placements_this_month: hiredThisMonth,
      placements_this_quarter: hiredThisQuarter,
      referral_pending: referralStatusCounts["Pending"] || 0,
      referral_for_interview: referralStatusCounts["For Interview"] || 0,
      referral_hired: referralStatusCounts["Hired"] || 0,
      referral_rejected: referralStatusCounts["Rejected"] || 0,
      referral_withdrawn: referralStatusCounts["Withdrawn"] || 0,
      jobs_draft: jobStatusCounts["draft"] || 0,
      jobs_pending: jobStatusCounts["pending"] || 0,
      jobs_active: jobStatusCounts["active"] || 0,
      jobs_closed: jobStatusCounts["closed"] || 0,
      jobs_archived: jobStatusCounts["archived"] || 0,
      applications_pending: applicationStatusCounts["pending"] || 0,
      applications_reviewed: applicationStatusCounts["reviewed"] || 0,
      applications_shortlisted: applicationStatusCounts["shortlisted"] || 0,
      applications_interview: applicationStatusCounts["interview"] || 0,
      applications_hired: applicationStatusCounts["hired"] || 0,
      applications_rejected: applicationStatusCounts["rejected"] || 0,
    };

    const industryRows: ReportRow[] = Object.entries(industryCounts).map(
      ([industry, count]) => ({
        report_type: "",
        reporting_period: "",
        generated_by: "",
        total_job_seekers: 0,
        total_employers: 0,
        total_job_postings: 0,
        total_applications: 0,
        total_referrals: 0,
        placements_this_month: 0,
        placements_this_quarter: 0,
        referral_pending: 0,
        referral_for_interview: 0,
        referral_hired: 0,
        referral_rejected: 0,
        referral_withdrawn: 0,
        jobs_draft: 0,
        jobs_pending: 0,
        jobs_active: 0,
        jobs_closed: 0,
        jobs_archived: 0,
        applications_pending: 0,
        applications_reviewed: 0,
        applications_shortlisted: 0,
        applications_interview: 0,
        applications_hired: 0,
        applications_rejected: 0,
        industry: industry,
        industry_count: count,
      })
    );

    const doleReport = [summaryRow, ...industryRows];

    return exportResponse(
      format,
      "dole_report",
      doleReport as unknown as Array<Record<string, unknown>>,
      `dole-statistical-report-${new Date().toISOString().split("T")[0]}`
    );
  } catch (error) {
    console.error("[GET /api/admin/export/reports/dole] Failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}