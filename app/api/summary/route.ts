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

    const [{ count: applicantsCount }, { count: employersCount }, { count: successfulReferralsCount }] = await Promise.all([
      db.from("users").select("*", { count: "exact", head: true }),
      db.from("employers").select("*", { count: "exact", head: true }).eq("account_status", "approved"),
      db.from("referrals").select("*", { count: "exact", head: true }).eq("status", "Hired"),
    ]);

    const payload: SummaryResponse = {
      totalApplicants: { value: applicantsCount ?? 0 },
      activeEmployers: { value: employersCount ?? 0 },
      successfulReferrals: { value: successfulReferralsCount ?? 0 },
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