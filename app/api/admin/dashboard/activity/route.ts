import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20) || 20, 1), 50);
    const hours = Math.min(Math.max(Number(searchParams.get("hours") ?? 24) || 24, 1), 168);
    const type = searchParams.get("type");

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [
      recentJobs,
      recentApplications,
      recentEmployers,
      recentAccessRequests,
    ] = await Promise.all([
      supabaseAdmin
        .from("jobs")
        .select("id, position_title, status, created_at, employer_id")
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("applications")
        .select("id, status, created_at, updated_at, user_id, job_id")
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("employers")
        .select("id, establishment_name, account_status, created_at, updated_at")
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("admin_access_requests")
        .select("id, name, email, status, created_at, reviewed_at")
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const getJobTitle = async (jobId: string): Promise<string> => {
      const result = await supabaseAdmin
        .from("jobs")
        .select("position_title")
        .eq("id", jobId)
        .single();
      return result.data?.position_title ?? "Unknown Position";
    };

    const getUserName = async (userId: string): Promise<string> => {
      const result = await supabaseAdmin
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .single();
      return result.data?.name ?? result.data?.email ?? "Unknown User";
    };

    const getEmployerName = async (employerId: string): Promise<string> => {
      const result = await supabaseAdmin
        .from("employers")
        .select("establishment_name")
        .eq("id", employerId)
        .single();
      return result.data?.establishment_name ?? "Unknown Employer";
    };

    const activities = [];
    const jobMap = new Map<string, string>();
    const userMap = new Map<string, string>();
    const employerMap = new Map<string, string>();

    for (const job of (recentJobs.data ?? [])) {
      activities.push({
        id: job.id,
        type: "job",
        icon: job.status === "pending" ? "clock" : job.status === "active" ? "check-circle" : "file-text",
        title: job.position_title,
        description: getJobDescription(job.status),
        timestamp: job.created_at,
        status: job.status,
      });
    }

    for (const app of (recentApplications.data ?? [])) {
      if (!jobMap.has(app.job_id)) {
        jobMap.set(app.job_id, await getJobTitle(app.job_id));
      }
      if (!userMap.has(app.user_id)) {
        userMap.set(app.user_id, await getUserName(app.user_id));
      }
      activities.push({
        id: app.id,
        type: "application",
        icon: getApplicationIcon(app.status),
        title: await getUserName(app.user_id),
        description: `${getApplicationDescription(app.status)}: ${jobMap.get(app.job_id)}`,
        timestamp: app.updated_at ?? app.created_at,
        status: app.status,
      });
    }

    for (const employer of (recentEmployers.data ?? [])) {
      activities.push({
        id: employer.id,
        type: "employer",
        icon: employer.account_status === "pending" ? "clock" : "building",
        title: employer.establishment_name,
        description: getEmployerDescription(employer.account_status),
        timestamp: employer.updated_at ?? employer.created_at,
        status: employer.account_status,
      });
    }

    for (const request of (recentAccessRequests.data ?? [])) {
      activities.push({
        id: request.id,
        type: "access_request",
        icon: request.status === "pending" ? "user-plus" : "user-check",
        title: request.name,
        description: `${request.status === "pending" ? "Requested" : getAccessDescription(request.status)} admin access`,
        timestamp: request.reviewed_at ?? request.created_at,
        status: request.status,
      });
    }

    activities.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    let filtered = activities.slice(0, limit);
    if (type && ["job", "application", "employer", "access_request"].includes(type)) {
      filtered = filtered.filter(a => a.type === type);
    }

    return NextResponse.json({
      activities: filtered,
      summary: {
        total: activities.length,
        jobs: (recentJobs.data ?? []).length,
        applications: (recentApplications.data ?? []).length,
        employers: (recentEmployers.data ?? []).length,
        accessRequests: (recentAccessRequests.data ?? []).length,
      },
      period: {
        hours,
        from: cutoff.toISOString(),
        to: new Date().toISOString(),
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Admin activity feed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getJobDescription(status: string): string {
  switch (status) {
    case "pending": return "Submitted for review";
    case "active": return "Approved and published";
    case "closed": return "Closed by employer";
    case "draft": return "Saved as draft";
    case "archived": return "Archived";
    default: return `Status: ${status}`;
  }
}

function getApplicationDescription(status: string): string {
  switch (status) {
    case "pending": return "New application";
    case "reviewed": return "Application reviewed";
    case "shortlisted": return "Shortlisted";
    case "interview": return "Interview scheduled";
    case "hired": return "Hired";
    case "rejected": return "Not selected";
    case "withdrawn": return "Withdrawn by applicant";
    default: return `Status: ${status}`;
  }
}

function getApplicationIcon(status: string): string {
  switch (status) {
    case "pending": return "inbox";
    case "reviewed": return "eye";
    case "shortlisted": return "star";
    case "interview": return "calendar";
    case "hired": return "check-circle";
    case "rejected": return "x-circle";
    case "withdrawn": return "arrow-left";
    default: return "file";
  }
}

function getEmployerDescription(status: string): string {
  switch (status) {
    case "pending": return "Awaiting verification";
    case "approved": return "Account verified";
    case "rejected": return "Verification failed";
    case "suspended": return "Account suspended";
    default: return `Status: ${status}`;
  }
}

function getAccessDescription(status: string): string {
  switch (status) {
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    default: return status;
  }
}