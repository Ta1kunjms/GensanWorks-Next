export const dynamic = "force-dynamic";
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
    const groupBy = searchParams.get("groupBy") || "city";

    const [usersResult, jobsResult, employersResult] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, city, province, employment_status"),
      supabaseAdmin
        .from("jobs")
        .select("id, status, employer_id")
        .eq("status", "active"),
      supabaseAdmin
        .from("employers")
        .select("id, city, province, account_status")
        .eq("account_status", "approved"),
    ]);

    const users = usersResult.data ?? [];
    const activeJobs = jobsResult.data ?? [];
    const activeEmployers = employersResult.data ?? [];

    const stats: Record<string, { 
      name: string; 
      jobSeekers: number; 
      activeJobs: number; 
      employers: number;
      employed: number;
      unemployed: number;
      seeking: number;
    }> = {};

    for (const user of users) {
      const key = groupBy === "city" 
        ? (user.city || "Unknown") 
        : (user.province || "Unknown");
      
      if (!stats[key]) {
        stats[key] = { 
          name: key, 
          jobSeekers: 0, 
          activeJobs: 0, 
          employers: 0,
          employed: 0,
          unemployed: 0,
          seeking: 0,
        };
      }
      
      stats[key].jobSeekers++;
      if (user.employment_status === "employed") stats[key].employed++;
      else if (user.employment_status === "unemployed") stats[key].unemployed++;
      else if (user.employment_status === "seeking") stats[key].seeking++;
    }

    for (const job of activeJobs) {
      const employer = activeEmployers.find(e => e.id === job.employer_id);
      if (!employer) continue;
      
      const key = groupBy === "city" 
        ? (employer.city || "Unknown") 
        : (employer.province || "Unknown");
      
      if (!stats[key]) {
        stats[key] = { 
          name: key, 
          jobSeekers: 0, 
          activeJobs: 0, 
          employers: 0,
          employed: 0,
          unemployed: 0,
          seeking: 0,
        };
      }
      
      stats[key].activeJobs++;
    }

    for (const employer of activeEmployers) {
      const key = groupBy === "city" 
        ? (employer.city || "Unknown") 
        : (employer.province || "Unknown");
      
      if (!stats[key]) {
        stats[key] = { 
          name: key, 
          jobSeekers: 0, 
          activeJobs: 0, 
          employers: 0,
          employed: 0,
          unemployed: 0,
          seeking: 0,
        };
      }
      
      stats[key].employers++;
    }

    const sortedStats = Object.values(stats)
      .sort((a, b) => b.jobSeekers - a.jobSeekers);

    const totalJobSeekers = sortedStats.reduce((sum, s) => sum + s.jobSeekers, 0);
    const totalActiveJobs = sortedStats.reduce((sum, s) => sum + s.activeJobs, 0);
    const totalEmployers = sortedStats.reduce((sum, s) => sum + s.employers, 0);

    const distribution = sortedStats.map(s => ({
      name: s.name,
      jobSeekers: s.jobSeekers,
      jobSeekersPercent: totalJobSeekers > 0 ? Math.round((s.jobSeekers / totalJobSeekers) * 100) : 0,
      activeJobs: s.activeJobs,
      activeJobsPercent: totalActiveJobs > 0 ? Math.round((s.activeJobs / totalActiveJobs) * 100) : 0,
      employers: s.employers,
      employersPercent: totalEmployers > 0 ? Math.round((s.employers / totalEmployers) * 100) : 0,
    }));

    return NextResponse.json({
      groupBy,
      total: {
        jobSeekers: totalJobSeekers,
        activeJobs: totalActiveJobs,
        employers: totalEmployers,
      },
      distribution,
      summary: {
        topCity: distribution[0]?.name || "N/A",
        topCityJobSeekers: distribution[0]?.jobSeekers || 0,
        locationsCount: distribution.length,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Admin geographic stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}