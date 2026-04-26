export const dynamic = "force-dynamic";
import { ensureAdmin, readFormatFromUrl } from "@/lib/legacy-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { exportResponse } from "@/api/admin/export/_utils";

function getMonthBounds(monthsAgo: number) {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  return { start: targetMonth.toISOString(), end: endOfMonth.toISOString() };
}

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const format = readFormatFromUrl(req.url) ?? "csv";
    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "monthly";

    const monthsAgo = period === "quarterly" ? 3 : 1;
    const bounds = getMonthBounds(monthsAgo);

    const [currentReferralsResult, topEmployersResult, usersResult, jobsResult, applicationsResult] = await Promise.all([
      supabaseAdmin.from("referrals").select("status, employer_id, created_at").gte("created_at", bounds.start),
      supabaseAdmin.from("referrals").select("employer_id, status"),
      supabaseAdmin.from("users").select("id, created_at"),
      supabaseAdmin.from("jobs").select("id, status, created_at"),
      supabaseAdmin.from("applications").select("id, status, created_at"),
    ]);

    const currentStatusCounts: Record<string, number> = {};
    const employerCounts: Record<string, number> = {};

    (currentReferralsResult.data ?? []).forEach((ref) => {
      const status = ref.status as string;
      currentStatusCounts[status] = (currentStatusCounts[status] ?? 0) + 1;
      if (ref.employer_id) {
        employerCounts[ref.employer_id] = (employerCounts[ref.employer_id] ?? 0) + 1;
      }
    });

    const topEmployerIds = Object.entries(employerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    let topEmployersWithNames: Array<{ name: string; referrals: number }> = [];
    if (topEmployerIds.length > 0) {
      const { data: empData } = await supabaseAdmin.from("employers").select("id, establishment_name").in("id", topEmployerIds);
      topEmployersWithNames = topEmployerIds.map((id) => {
        const emp = empData?.find((e) => e.id === id);
        return { name: emp?.establishment_name || "Unknown", referrals: employerCounts[id] || 0 };
      });
    }

    const currentHired = currentStatusCounts["Hired"] || 0;
    const currentTotal = Object.values(currentStatusCounts).reduce((a, b) => a + b, 0);
    const currentRate = currentTotal > 0 ? Math.round((currentHired / currentTotal) * 100) : 0;

    const periodLabel = period === "quarterly" ? "Quarterly" : "Monthly";
    const currentDate = new Date();
    const periodDate = currentDate.toLocaleDateString("en-PH", { year: "numeric", month: "long" });

    const summaryData: Array<Record<string, unknown>> = [
      {
        report_type: `${periodLabel} Summary Report`,
        reporting_period: periodDate,
        generated_by: "GensanWorks PESO Admin",
        total_referrals: currentTotal,
        referrals_pending: currentStatusCounts["Pending"] || 0,
        referrals_for_interview: currentStatusCounts["For Interview"] || 0,
        referrals_hired: currentHired,
        referrals_rejected: currentStatusCounts["Rejected"] || 0,
        referrals_withdrawn: currentStatusCounts["Withdrawn"] || 0,
        success_rate: currentRate,
        new_job_seekers: usersResult.data?.length || 0,
        new_jobs_posted: jobsResult.data?.length || 0,
        new_applications: applicationsResult.data?.length || 0,
      },
      ...topEmployersWithNames.map((emp, index) => ({
        report_type: `Top Employer ${index + 1}`,
        reporting_period: "",
        generated_by: emp.name,
        total_referrals: emp.referrals,
        referrals_pending: 0,
        referrals_for_interview: 0,
        referrals_hired: 0,
        referrals_rejected: 0,
        referrals_withdrawn: 0,
        success_rate: 0,
        new_job_seekers: 0,
        new_jobs_posted: 0,
        new_applications: 0,
      })),
    ];

    return exportResponse(format, "summary_report", summaryData, `${period}-summary-report-${new Date().toISOString().split("T")[0]}`);
  } catch (error) {
    console.error("[GET /api/admin/export/reports/summary] Failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}