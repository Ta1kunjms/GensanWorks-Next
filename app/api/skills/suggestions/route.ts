import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId, parseBoundedInt } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

const querySchema = z
  .object({
    q: z.string().optional(),
    limit: z.string().optional(),
  })
  .strict();

const createSchema = z.union([
  z.object({ name: z.string().min(1).max(255) }).strict(),
  z.object({ names: z.array(z.string().min(1).max(255)).min(1).max(100) }).strict(),
]);

function normalizeSkillSuggestionName(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const normalized = trimmed.toLowerCase();
  return { trimmed, normalized };
}

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role as "admin" | "employer" | "jobseeker" };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);

  try {
    const rateLimit = enforceRateLimit({
      key: `skills:suggestions:get:${clientIp}`,
      maxRequests: 60,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limited", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = parseBoundedInt(searchParams.get("limit"), { fallback: 20, min: 1, max: 100 });

    let query = db.from("skill_suggestions").select("name, frequency, category").order("frequency", { ascending: false }).limit(limit);

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data: suggestions } = await query;

    return NextResponse.json({ suggestions: suggestions || [], requestId });
  } catch (error) {
    console.error("[GET /api/skills/suggestions] Failed:", error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}