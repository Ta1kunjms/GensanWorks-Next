import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { applicationsTable, usersTable } from "@/db/schema";

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
    const [salaryRows, totalApplications, hiredApplications] = await Promise.all([
      db
        .select({ salaryExpectation: usersTable.salaryExpectation })
        .from(usersTable),
      db
        .select({ count: sql<number>`count(*)` })
        .from(applicationsTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(applicationsTable)
        .where(sql`${applicationsTable.status} = 'hired'`)
        .then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    const salaryValues = salaryRows
      .map((row) => (row.salaryExpectation === null ? null : Number(row.salaryExpectation)))
      .filter((value): value is number => Number.isFinite(value));

    const avgSalaryValue =
      salaryValues.length > 0
        ? salaryValues.reduce((sum, current) => sum + current, 0) / salaryValues.length
        : 32_000;

    const satisfactionRate =
      totalApplications > 0
        ? `${Math.round((hiredApplications / totalApplications) * 100)}%`
        : fallbackImpact.satisfactionRate;

    const payload: ImpactResponse = {
      avgTimeToInterview: fallbackImpact.avgTimeToInterview,
      avgSalary: toPesoThousands(avgSalaryValue),
      satisfactionRate,
      yearsOfService: fallbackImpact.yearsOfService,
    };

    return NextResponse.json(payload, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  } catch (error) {
    console.error("[GET /api/public/impact] Failed:", error);
    return NextResponse.json(fallbackImpact, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  }
}
