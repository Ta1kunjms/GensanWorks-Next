import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type SkillsData = Array<{
  skill: string;
  percentage: number;
}>;

const fallbackSkills: SkillsData = [
  { skill: "Customer Support", percentage: 92 },
  { skill: "Digital Marketing", percentage: 88 },
  { skill: "Accounting", percentage: 84 },
  { skill: "Front-End Development", percentage: 81 },
  { skill: "Healthcare Assistance", percentage: 79 },
  { skill: "Logistics Management", percentage: 75 },
  { skill: "Sales Strategy", percentage: 73 },
  { skill: "Technical Support", percentage: 69 },
];

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `landing:skills:${clientIp}`,
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
    const { data: users } = await db
      .from("users")
      .select("skills")
      .not("skills", "is", null)
      .limit(100);

    if (!users || users.length === 0) {
      return NextResponse.json(fallbackSkills, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      });
    }

    const skillsCount = new Map<string, number>();
    
    users.forEach((user) => {
      if (user.skills && Array.isArray(user.skills)) {
        user.skills.forEach((skill: string) => {
          const current = skillsCount.get(skill) || 0;
          skillsCount.set(skill, current + 1);
        });
      }
    });

    const total = Array.from(skillsCount.values()).reduce((a, b) => a + b, 0);
    const skills: SkillsData = Array.from(skillsCount.entries())
      .map(([skill, count]) => ({
        skill,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    const finalSkills = skills.length > 0 ? skills : fallbackSkills;

    return NextResponse.json(finalSkills, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[GET /api/landing/skills] Failed:", error);
    return NextResponse.json(fallbackSkills, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  }
}