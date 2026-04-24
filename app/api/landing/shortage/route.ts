import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";

type ExpectedSkillsShortage = {
  skillCluster: string;
  projectedGap: string;
  timeframe: string;
  driver: string;
  focus: string;
};

type ShortageInitiative = {
  title: string;
  description: string;
  owner: string;
};

type ShortageResponse = {
  shortages: ExpectedSkillsShortage[];
  initiatives: ShortageInitiative[];
};

const fallbackShortage: ShortageResponse = {
  shortages: [
    {
      skillCluster: "AI-ready Developers",
      projectedGap: "300 roles",
      timeframe: "Q1–Q3 2025",
      driver: "Fintech and logistics platforms rolling out automation",
      focus: "Full stack + data pipeline",
    },
    {
      skillCluster: "Healthcare Support",
      projectedGap: "220 roles",
      timeframe: "Next 12 months",
      driver: "Regional hospital expansion and aging population",
      focus: "Patient care + inventory",
    },
    {
      skillCluster: "Certified Welders",
      projectedGap: "180 roles",
      timeframe: "Before new export hub opens",
      driver: "Fabrication contracts in SOCCSKSARGEN",
      focus: "NC II + safety compliance",
    },
    {
      skillCluster: "CX Specialists",
      projectedGap: "150 roles",
      timeframe: "Next 2 quarters",
      driver: "BPO providers scaling GenSan pods",
      focus: "Omnichannel support",
    },
  ],
  initiatives: [
    {
      title: "Scholarship Slots",
      description: "Allocate 120 TESDA-backed seats for AI and automation tracks.",
      owner: "PESO + TESDA",
    },
    {
      title: "Employer Bootcamps",
      description: "Run joint clinics with hospitals and steelworks to co-design training.",
      owner: "Industry Desk",
    },
    {
      title: "CX Career Sprint",
      description: "Two-week finishing course to convert hospitality workers into CX hires.",
      owner: "Job Center",
    },
  ],
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `landing:shortage:${clientIp}`,
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

  return NextResponse.json(fallbackShortage, {
    headers: {
      "X-Request-ID": requestId,
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}