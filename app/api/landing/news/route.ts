import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `landing:news:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { data: news, error } = await db
      .from("landing_news")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(6);

    if (error) throw error;

    return NextResponse.json({ news: news || [] }, {
      headers: {
        "X-Request-ID": requestId,
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("[GET /api/landing/news] Failed:", error);
    return NextResponse.json({ news: [] });
  }
}
