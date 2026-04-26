export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type ImpactResponse = {
  avgTimeToInterview: string;
  avgSalary: string;
  satisfactionRate: string;
  yearsOfService: number;
};

const fallbackImpact: ImpactResponse = {
  avgTimeToInterview: "48 hrs",
  avgSalary: "₱32K",
  satisfactionRate: "94%",
  yearsOfService: 25,
};

function toPesoThousands(value: number) {
  const rounded = Math.max(0, Math.round(value / 1000));
  return `₱${rounded}K`;
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `impact:public:${clientIp}`,
    maxRequests: 120,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  }

  try {
    const [
      { data: salaryRows }, 
      { count: totalApplications }, 
      { count: hiredApplications },
      { data: customMetrics }
    ] = await Promise.all([
      db.from("users").select("salary_expectation"),
      db.from("applications").select("*", { count: "exact", head: true }),
      db.from("applications").select("*", { count: "exact", head: true }).eq("status", "hired"),
      db.from("landing_metrics").select("key, value, unit")
    ]);

    const metricsMap = (customMetrics || []).reduce((acc, m) => {
      acc[m.key] = m.unit === "%" ? `${m.value}%` : (m.unit === "hrs" ? `${m.value} hrs` : m.value);
      return acc;
    }, {} as Record<string, string>);

    const salaryValues = (salaryRows || [])
      .map((row) => (row.salary_expectation === null ? null : Number(row.salary_expectation)))
      .filter((value): value is number => Number.isFinite(value));

    const avgSalaryValue =
      salaryValues.length > 0
        ? salaryValues.reduce((sum, current) => sum + current, 0) / salaryValues.length
        : 32_000;

    const satisfactionRate = metricsMap['satisfaction_rate'] || (
      (totalApplications || 0) > 0
        ? `${Math.round(((hiredApplications || 0) / (totalApplications || 1)) * 100)}%`
        : fallbackImpact.satisfactionRate
    );

    const payload: ImpactResponse = {
      avgTimeToInterview: metricsMap['avg_time_to_interview'] || fallbackImpact.avgTimeToInterview,
      avgSalary: toPesoThousands(avgSalaryValue),
      satisfactionRate,
      yearsOfService: parseInt(metricsMap['years_of_service'] || String(fallbackImpact.yearsOfService)),
    };

    return NextResponse.json(payload, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/public/impact] Failed:", error);
    return NextResponse.json(
      { error: "Service unavailable" },
      {
        status: 503,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  }
}