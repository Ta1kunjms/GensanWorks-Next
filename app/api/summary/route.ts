import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type SummaryResponse = {
  totalApplicants: { value: number };
  activeEmployers: { value: number };
  successfulReferrals: { value: number };
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
    const probeMode = request.nextUrl.searchParams.get("probe") === "1";
    if (probeMode) {
      await db.from("settings").select("key").limit(1);
      return NextResponse.json(
        { ok: true },
        {
          headers: {
            "X-Request-ID": requestId,
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      { count: applicantsCount },
      { count: applicantsPrevCount },
      { count: employersCount },
      { count: employersPrevCount },
      { count: successfulReferralsCount },
      { count: successfulReferralsPrevCount },
    ] = await Promise.all([
      db.from("users").select("*", { count: "exact", head: true }),
      db.from("users").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo.toISOString()),
      db.from("employers").select("*", { count: "exact", head: true }).eq("account_status", "approved"),
      db.from("employers").select("*", { count: "exact", head: true }).eq("account_status", "approved").lt("created_at", thirtyDaysAgo.toISOString()),
      db.from("referrals").select("*", { count: "exact", head: true }).eq("status", "Hired"),
      db.from("referrals").select("*", { count: "exact", head: true }).eq("status", "Hired").lt("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const calculateGrowth = (current: number | null, previous: number | null) => {
      const curr = current ?? 0;
      const prev = previous ?? 0;
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const payload = {
      totalApplicants: { 
        value: applicantsCount ?? 0,
        growth: calculateGrowth(applicantsCount, applicantsPrevCount)
      },
      activeEmployers: { 
        value: employersCount ?? 0,
        growth: calculateGrowth(employersCount, employersPrevCount)
      },
      successfulReferrals: { 
        value: successfulReferralsCount ?? 0,
        growth: calculateGrowth(successfulReferralsCount, successfulReferralsPrevCount)
      },
    };

    return NextResponse.json(payload, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[GET /api/summary] Failed:", error);
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