import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type ExperienceHighlight = {
  title: string;
  description: string;
  icon: string; // This would map to lucide icon names
};

type ExperienceResponse = {
  highlights: ExperienceHighlight[];
  yearsOfService: number;
};

const fallbackExperience: ExperienceResponse = {
  highlights: [
    { 
      title: "Responsive Everywhere", 
      description: "Desktop, tablet, or mobile—continue applications seamlessly.",
      icon: "Smartphone" 
    },
    { 
      title: "Career Coaching", 
      description: "PESO counselors help polish resumes and prep interviews.",
      icon: "GraduationCap" 
    },
    { 
      title: "Human + AI Support", 
      description: "Automations handle busywork while people focus on you.",
      icon: "HeadphonesIcon" 
    },
    { 
      title: "Skills Mapping", 
      description: "Match certificates and NCII levels with in-demand roles instantly.",
      icon: "FileText" 
    },
  ],
  yearsOfService: 25
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `experience:${clientIp}`,
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
    // Try to fetch from experience_highlights table
    const { data: highlightsData, error: highlightsError } = await db
      .from("experience_highlights")
      .select("title, description, icon")
      .order("id", { ascending: true });

    // Try to fetch years of service from settings or impact data
    let yearsOfService = fallbackExperience.yearsOfService;
    const { data: settingsData, error: settingsError } = await db
      .from("settings")
      .select("value")
      .eq("key", "years_of_service")
      .single();

    if (!settingsError && settingsData) {
      yearsOfService = Number(settingsData.value) || fallbackExperience.yearsOfService;
    }

    // If we couldn't get highlights, try to get from impact data as fallback
    let highlights = fallbackExperience.highlights;
    if (highlightsError || !highlightsData || highlightsData.length === 0) {
      // Try to get from settings
      const { data: expData, error: expError } = await db
        .from("settings")
        .select("value")
        .eq("key", "experience_highlights")
        .single();
      
      if (!expError && expData && typeof expData.value === 'string') {
        try {
          const parsed = JSON.parse(expData.value);
          if (Array.isArray(parsed)) {
            highlights = parsed;
          }
        } catch (e) {
          // Keep fallback if parsing fails
        }
      }
    } else {
      // Transform highlights data
      highlights = highlightsData.map((highlight: any) => ({
        title: highlight.title,
        description: highlight.description,
        icon: highlight.icon
      }));
    }

    return NextResponse.json({ highlights, yearsOfService }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/experience] Failed:", error);
    return NextResponse.json(fallbackExperience, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}