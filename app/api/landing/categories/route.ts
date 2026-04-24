import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `landing:categories:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    // Fetch unique categories and their counts
    const { data: categories, error } = await db
      .from("jobs")
      .select("category")
      .eq("is_active", true)
      .eq("archived", false)
      .not("category", "is", null);

    if (error) throw error;

    const counts = (categories || []).reduce((acc, job) => {
      const cat = job.category;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const formattedCategories = Object.entries(counts).map(([name, count]) => ({
      name,
      category: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      jobs: `${count.toLocaleString()} open roles`,
    }));

    return NextResponse.json({ categories: formattedCategories }, {
      headers: {
        "X-Request-ID": requestId,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("[GET /api/landing/categories] Failed:", error);
    return NextResponse.json({ categories: [] });
  }
}
