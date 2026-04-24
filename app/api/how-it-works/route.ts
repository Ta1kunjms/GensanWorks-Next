import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type HowItWorksStep = {
  id: number;
  title: string;
  description: string;
  icon: string; // This would map to lucide icon names
  iconColor: string;
  bgColor: string;
  bullets: string[];
  ctaText: string;
  ctaHref: string;
};

type HowItWorksResponse = {
  steps: HowItWorksStep[];
};

const fallbackHowItWorks: HowItWorksResponse = {
  steps: [
    {
      id: 1,
      title: "Create Your Profile",
      description: "Sign up, upload credentials, and highlight your skills in minutes.",
      icon: "UserCheck",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      bullets: [
        "Upload resume & certificates",
        "Highlight your skills",
        "Set job preferences",
        "Verify your identity with PESO"
      ],
      ctaText: "Start Profile",
      ctaHref: "/signup/jobseeker"
    },
    {
      id: 2,
      title: "Discover Opportunities",
      description: "Curated recommendations, smart filters, and instant notifications.",
      icon: "Search",
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      bullets: [
        "AI-powered job matching",
        "Realtime status updates",
        "Direct employer chat",
        "Referral tracking"
      ],
      ctaText: "Browse Jobs",
      ctaHref: "/jobs"
    },
    {
      id: 3,
      title: "Get Hired & Grow",
      description: "Track progress, attend interviews, and access career development.",
      icon: "Briefcase",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      bullets: [
        "Interview scheduling & prep",
        "Offer negotiation support",
        "Skills gap analysis",
        "Continuous learning paths"
      ],
      ctaText: "Explore Training",
      ctaHref: "/training"
    }
  ]
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `how-it-works:${clientIp}`,
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
    // Try to fetch from how_it_steps table
    const { data: stepsData, error } = await db
      .from("how_it_steps")
      .select("id, title, description, icon, icon_color, bg_color, bullets, cta_text, cta_href")
      .order("id", { ascending: true });

    if (error || !stepsData || stepsData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackHowItWorks, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    // Transform data to match expected format
    const steps: HowItWorksStep[] = stepsData.map((step: any) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      icon: step.icon,
      iconColor: step.icon_color,
      bgColor: step.bg_color,
      bullets: Array.isArray(step.bullets) ? step.bullets : [],
      ctaText: step.cta_text,
      ctaHref: step.cta_href
    }));

    return NextResponse.json({ steps }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/how-it-works] Failed:", error);
    return NextResponse.json(fallbackHowItWorks, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}