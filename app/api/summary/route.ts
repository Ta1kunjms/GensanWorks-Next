import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { employersTable, referralsTable, usersTable } from "@/db/schema";

type SummaryResponse = {
  totalApplicants: { value: number };
  activeEmployers: { value: number };
  successfulReferrals: { value: number };
};

const fallbackSummary: SummaryResponse = {
  totalApplicants: { value: 0 },
  activeEmployers: { value: 0 },
  successfulReferrals: { value: 0 },
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `summary:public:${clientIp}`,
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
    const [applicantsCount, employersCount, successfulReferralsCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(employersTable)
        .where(sql`${employersTable.accountStatus} = 'approved'`)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(referralsTable)
        .where(sql`${referralsTable.status} = 'Hired'`)
        .then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    const payload: SummaryResponse = {
      totalApplicants: { value: applicantsCount },
      activeEmployers: { value: employersCount },
      successfulReferrals: { value: successfulReferralsCount },
    };

    return NextResponse.json(payload, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  } catch (error) {
    console.error("[GET /api/summary] Failed:", error);
    return NextResponse.json(fallbackSummary, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  }
}
