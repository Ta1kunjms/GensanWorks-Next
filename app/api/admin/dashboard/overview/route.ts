export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      usersResult,
      employersResult,
      jobsResult,
      applicationsResult,
      pendingEmployersResult,
      pendingJobsResult,
      pendingAdminRequestsResult,
      recentJobsResult,
      recentApplicationsResult,
      recentEmployersResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, employment_status, registration_date", { count: "exact" }),
      supabaseAdmin
        .from("employers")
        .select("id, account_status, created_at", { count: "exact" }),
      supabaseAdmin
        .from("jobs")
        .select("id, status, created_at, deadline", { count: "exact" }),
      supabaseAdmin
        .from("applications")
        .select("id, status, created_at, updated_at", { count: "exact" }),
      supabaseAdmin
        .from("employers")
        .select("id, establishment_name, created_at")
        .eq("account_status", "pending")
        .lt("created_at", sevenDaysAgo.toISOString()),
      supabaseAdmin
        .from("jobs")
        .select("id, position_title, employer_id, created_at")
        .eq("status", "pending")
        .lt("created_at", sevenDaysAgo.toISOString()),
      supabaseAdmin
        .from("admin_access_requests")
        .select("id, created_at")
        .eq("status", "pending")
        .lt("created_at", sevenDaysAgo.toISOString()),
      supabaseAdmin
        .from("jobs")
        .select("id, position_title, status, created_at, employer_id")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("applications")
        .select("id, user_id, job_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("employers")
        .select("id, establishment_name, account_status, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const users = usersResult.data ?? [];
    const employers = employersResult.data ?? [];
    const jobs = jobsResult.data ?? [];
    const applications = applicationsResult.data ?? [];

    const employedCount = users.filter(u => u.employment_status === "employed").length;
    const unemployedCount = users.filter(u => u.employment_status === "unemployed").length;
    const ofwCount = users.filter(u => u.employment_status === "ofw").length;
    const seekingCount = users.filter(u => u.employment_status === "seeking").length;

    const jobsThisMonth = jobs.filter(j => {
      if (!j.created_at) return false;
      const created = new Date(j.created_at);
      return created >= oneMonthAgo && created <= now;
    }).length;

    const applicationsThisMonth = applications.filter(a => {
      if (!a.created_at) return false;
      const created = new Date(a.created_at);
      return created >= oneMonthAgo && created <= now;
    }).length;

    const hiredThisMonth = applications.filter(a => {
      if (!a.updated_at) return false;
      const updated = new Date(a.updated_at);
      return updated >= oneMonthAgo && updated <= now && a.status === "hired";
    }).length;

    const jobsExpiringSoon = jobs.filter(j => {
      if (!j.deadline) return false;
      const deadline = new Date(j.deadline);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 7 && j.status === "active";
    }).length;

    const geoDistribution = users.reduce((acc, u) => {
      const city = u.registration_date || "Unknown";
      if (!acc[city]) acc[city] = 0;
      acc[city]++;
      return acc;
    }, {} as Record<string, number>);

    const jobStatusCounts = jobs.reduce((acc, j) => {
      const status = j.status || "unknown";
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {} as Record<string, number>);

    const applicationStatusCounts = applications.reduce((acc, a) => {
      const status = a.status || "unknown";
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = [
      ...recentJobsResult.data?.map((j: Record<string, unknown>) => ({
        id: j.id,
        type: "job",
        action: j.status === "pending" ? "pending_review" : "posted",
        title: j.position_title,
        timestamp: j.created_at,
      })) ?? [],
      ...recentApplicationsResult.data?.map((a: Record<string, unknown>) => ({
        id: a.id,
        type: "application",
        action: "received",
        title: `Application ${a.status}`,
        timestamp: a.created_at,
      })) ?? [],
      ...recentEmployersResult.data?.map((e: Record<string, unknown>) => ({
        id: e.id,
        type: "employer",
        action: e.account_status === "pending" ? "pending_verification" : "registered",
        title: e.establishment_name,
        timestamp: e.created_at,
      })) ?? [],
    ]
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(String(a.timestamp)).getTime() : 0;
        const timeB = b.timestamp ? new Date(String(b.timestamp)).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 10);

    const alerts = [];

    if (pendingAdminRequestsResult.data && pendingAdminRequestsResult.data.length > 0) {
      alerts.push({
        id: "stale-admin-requests",
        type: "urgent",
        message: `${pendingAdminRequestsResult.data.length} Admin Access Requests pending > 7 days`,
        count: pendingAdminRequestsResult.data.length,
        route: "/admin/access-requests",
      });
    }

    if (pendingEmployersResult.data && pendingEmployersResult.data.length > 0) {
      alerts.push({
        id: "stale-employers",
        type: "warning",
        message: `${pendingEmployersResult.data.length} Employers pending verification > 7 days`,
        count: pendingEmployersResult.data.length,
        route: "/admin/employers?status=pending",
      });
    }

    if (pendingJobsResult.data && pendingJobsResult.data.length > 0) {
      alerts.push({
        id: "stale-jobs",
        type: "warning",
        message: `${pendingJobsResult.data.length} Jobs pending review > 7 days`,
        count: pendingJobsResult.data.length,
        route: "/admin/jobs?status=pending",
      });
    }

    if (jobsExpiringSoon > 0) {
      alerts.push({
        id: "expiring-jobs",
        type: "info",
        message: `${jobsExpiringSoon} Jobs expiring within 7 days`,
        count: jobsExpiringSoon,
        route: "/admin/jobs",
      });
    }

    return NextResponse.json({
      kpis: {
        jobSeekers: {
          total: usersResult.count ?? 0,
          employed: employedCount,
          unemployed: unemployedCount,
          ofw: ofwCount,
          seeking: seekingCount,
        },
        employers: {
          total: employersResult.count ?? 0,
          active: employers.filter(e => e.account_status === "approved").length,
          pending: employers.filter(e => e.account_status === "pending").length,
          stalePending: pendingEmployersResult.data?.length ?? 0,
        },
        jobs: {
          total: jobsResult.count ?? 0,
          active: jobs.filter(j => j.status === "active").length,
          pending: jobs.filter(j => j.status === "pending").length,
          stalePending: pendingJobsResult.data?.length ?? 0,
          thisMonth: jobsThisMonth,
          expiringSoon: jobsExpiringSoon,
        },
        applications: {
          total: applicationsResult.count ?? 0,
          thisMonth: applicationsThisMonth,
          hiredThisMonth,
          placementRate: applicationsThisMonth > 0 
            ? Math.round((hiredThisMonth / applicationsThisMonth) * 100) 
            : 0,
        },
      },
      alerts: alerts.sort((a, b) => {
        const priority = { urgent: 0, warning: 1, info: 2 };
        return (priority[a.type as keyof typeof priority] ?? 2) - (priority[b.type as keyof typeof priority] ?? 2);
      }),
      jobStatusCounts: Object.entries(jobStatusCounts).map(([status, count]) => ({ status, count })),
      applicationStatusCounts: Object.entries(applicationStatusCounts).map(([status, count]) => ({ status, count })),
      recentActivity,
      staleItems: {
        adminRequests: pendingAdminRequestsResult.data ?? [],
        employers: pendingJobsResult.data ?? [],
        jobs: pendingJobsResult.data ?? [],
      },
      updatedAt: now.toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Admin dashboard overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}