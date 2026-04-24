import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type Service = {
  id: number;
  title: string;
  description: string;
  icon: string; // This would map to lucide icon names
  iconColor: string;
  bgColor: string;
  href: string;
  features: string[];
};

type ServicesResponse = {
  services: Service[];
};

const fallbackServices: ServicesResponse = {
  services: [
    {
      id: 1,
      title: "Job Search Portal",
      description: "Browse thousands of verified job opportunities across various industries.",
      icon: "Search",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/jobs",
      features: [
        "AI-powered matching",
        "Real-time notifications",
        "Salary insights",
        "Skill gap analysis"
      ]
    },
    {
      id: 2,
      title: "Post Job Vacancies",
      description: "Reach qualified candidates quickly with our streamlined posting system.",
      icon: "FileText",
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      href: "/employer/jobs",
      features: [
        "One-click posting",
        "Candidate screening",
        "Interview scheduling",
        "Performance analytics"
      ]
    },
    {
      id: 3,
      title: "Career Development",
      description: "Access training programs, workshops, and professional development resources.",
      icon: "Target",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/help",
      features: [
        "Free certifications",
        "Industry partnerships",
        "Resume building",
        "Interview prep"
      ]
    },
    {
      id: 4,
      title: "Job Fairs & Events",
      description: "Participate in career fairs, recruitment drives, and networking events.",
      icon: "Users",
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
      href: "/contact",
      features: [
        "Virtual & in-person",
        "Employer networking",
        "On-spot interviews",
        "Industry insights"
      ]
    },
    {
      id: 5,
      title: "Skills Verification",
      description: "Get your skills certified and verified by PESO-accredited assessors.",
      icon: "Sparkles",
      iconColor: "text-pink-600",
      bgColor: "bg-pink-50",
      href: "/help",
      features: [
        "NCII assessments",
        "Digital badges",
        "Skill portfolios",
        "Employer verification"
      ]
    },
    {
      id: 6,
      title: "Employer Solutions",
      description: "Complete workforce solutions for businesses of all sizes.",
      icon: "Activity",
      iconColor: "text-red-600",
      bgColor: "bg-red-50",
      href: "/employer/settings",
      features: [
        "Talent pooling",
        "Referral management",
        "Workforce planning",
        "Compliance support"
      ]
    }
  ]
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `services:${clientIp}`,
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
    // Try to fetch from services table
    const { data: servicesData, error } = await db
      .from("services")
      .select("id, title, description, icon, icon_color, bg_color, href, features")
      .order("id", { ascending: true });

    if (error || !servicesData || servicesData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackServices, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    // Transform data to match expected format
    const services: Service[] = servicesData.map((service: any) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      icon: service.icon,
      iconColor: service.icon_color,
      bgColor: service.bg_color,
      href: service.href,
      features: Array.isArray(service.features) ? service.features : []
    }));

    return NextResponse.json({ services }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/services] Failed:", error);
    return NextResponse.json(fallbackServices, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}