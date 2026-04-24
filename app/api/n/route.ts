import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type NewsItem = {
  type: string;
  title: string;
  description: string;
  location: string;
  date: string;
  color: string;
  link: string;
};

type NewsResponse = {
  news: NewsItem[];
};

const fallbackNews: NewsResponse = {
  news: [
    {
      type: "UPCOMING EVENT",
      title: "City-Wide Job Fair 2025",
      description: "Join our biggest job fair of the year on December 10, 2025 at the City Hall Grounds. Over 100 companies actively hiring!",
      location: "City Hall, General Santos",
      date: "December 10, 2025",
      color: "bg-blue-600",
      link: "/contact",
    },
    {
      type: "NEW FEATURE",
      title: "Enhanced Employer Portal",
      description: "We've launched new tools for employers: advanced filtering, bulk messaging, and detailed analytics dashboard.",
      location: "Available Now",
      date: "Live",
      color: "bg-green-600",
      link: "/employer/signup",
    },
    {
      type: "FREE TRAINING",
      title: "Resume Writing Workshop",
      description: "Free online seminar for jobseekers: Learn how to create a compelling resume that gets noticed by employers.",
      location: "Every Saturday, 2PM",
      date: "Ongoing",
      color: "bg-purple-600",
      link: "/help",
    },
  ]
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `news:${clientIp}`,
    maxRequests: 60,
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
    // Try to fetch from news table
    const { data: newsData, error } = await db
      .from("news")
      .select("type, title, description, location, date, color, link")
      .order("created_at", { ascending: false });

    if (error || !newsData || newsData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackNews, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Transform data to match expected format
    const news: NewsItem[] = newsData.map((item: any) => ({
      type: item.type,
      title: item.title,
      description: item.description,
      location: item.location,
      date: item.date,
      color: item.color,
      link: item.link
    }));

    return NextResponse.json({ news }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[GET /api/news] Failed:", error);
    return NextResponse.json(fallbackNews, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }
}