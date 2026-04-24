import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";

const defaultGeneralSettings = {
  siteName: "GensanWorks",
  siteDescription: "Official Job Assistance Platform of PESO - General Santos City",
  contactEmail: "admin@gensanworks.com",
  contactPhone: "+63 283 889 5200",
  address: "General Santos City, South Cotabato",
  heroHeadline: "Connecting jobseekers and employers in General Santos City",
  heroSubheadline: "A single window for opportunities, referrals, and PESO services",
  primaryCTA: "Browse Jobs",
  secondaryCTA: "Post a Vacancy",
  aboutTitle: "Why GensanWorks",
  aboutBody: "PESO-led platform for job matching, referrals, and analytics across the city.",
  heroBackgroundImage:
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80",
  seoKeywords: "peso gensan jobs, job portal gensan, peso referrals",
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `settings:general:public:${clientIp}`,
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

  return NextResponse.json(defaultGeneralSettings, {
    headers: {
      "X-Request-ID": requestId,
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
