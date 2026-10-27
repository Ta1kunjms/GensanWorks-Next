export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { loadLaborMarket } from "@/lib/labor-market-server";

// Public, read-only labour-market aggregates for the landing page.
// The queries and aggregation live in app/lib/labor-market-server.ts (loadLaborMarket),
// shared with the landing Server Component. Server-side service-role reads; the
// response carries counts, sector/skill aggregates and public listing data
// (employer names, job titles) only. No jobseeker names, emails or ids are returned.

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `labor-market:public:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  const limitHeaders = {
    "X-Request-ID": requestId,
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: limitHeaders });
  }

  try {
    const payload = await loadLaborMarket();

    return NextResponse.json(payload, {
      headers: {
        ...limitHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    // Table/query label and database message only; no row data is logged.
    console.error("[GET /api/public/labor-market] Failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Labour-market data is unavailable right now." },
      { status: 500, headers: limitHeaders }
    );
  }
}
