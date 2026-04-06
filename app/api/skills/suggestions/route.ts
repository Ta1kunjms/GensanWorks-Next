import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId, parseBoundedInt } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { skillSuggestionsTable } from "@/db/schema";

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
  return { userId: user.id, role: user.role };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.parse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `skills:suggestions:get:${clientIp}`,
      maxRequests: 120,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
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

    const limit = parseBoundedInt(parsed.limit ?? null, {
      fallback: 100,
      min: 1,
      max: 200,
    });

    const queryNorm = parsed.q ? normalizeSkillSuggestionName(parsed.q).normalized : "";

    const rows = await db
      .select({
        name: skillSuggestionsTable.name,
        normalizedName: skillSuggestionsTable.normalizedName,
      })
      .from(skillSuggestionsTable)
      .orderBy(desc(skillSuggestionsTable.updatedAt))
      .limit(2000);

    const filtered = (queryNorm
      ? rows.filter((row) => row.normalizedName.includes(queryNorm))
      : rows
    ).map((row) => row.name);

    if (!queryNorm) {
      return NextResponse.json(filtered.slice(0, limit), {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      });
    }

    const ranked = filtered
      .map((name) => {
        const normalized = normalizeSkillSuggestionName(name).normalized;
        return {
          name,
          score: normalized.startsWith(queryNorm) ? 0 : normalized.includes(queryNorm) ? 1 : 2,
        };
      })
      .filter((item) => item.score !== 2)
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((item) => item.name);

    return NextResponse.json(ranked, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || "Invalid query",
          field: firstIssue?.path?.[0],
          requestId,
        },
        { status: 400 }
      );
    }

    console.error("[GET /api/skills/suggestions] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `skills:suggestions:create:${identity.userId}:${clientIp}`,
      maxRequests: 40,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
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

    const parsed = createSchema.parse(await req.json());
    const names = "name" in parsed ? [parsed.name] : parsed.names;

    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const raw of names) {
      const { trimmed, normalized } = normalizeSkillSuggestionName(raw);
      if (!trimmed) continue;

      const existing = await db
        .select({ id: skillSuggestionsTable.id })
        .from(skillSuggestionsTable)
        .where(eq(skillSuggestionsTable.normalizedName, normalized))
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        skipped.push(trimmed);
        continue;
      }

      await db.insert(skillSuggestionsTable).values({
        name: trimmed,
        normalizedName: normalized,
        updatedAt: new Date(),
      });
      inserted.push(trimmed);
    }

    return NextResponse.json(
      { inserted, skipped },
      {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || "Invalid payload",
          field: firstIssue?.path?.[0],
          requestId,
        },
        { status: 400 }
      );
    }

    console.error("[POST /api/skills/suggestions] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
