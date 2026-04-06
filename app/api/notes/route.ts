import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { settingsTable } from "@/db/schema";
import { parseBoundedInt } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { ensureAuthenticated } from "@/lib/legacy-compat";

const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export async function GET(req: Request) {
  try {
    const authResult = await ensureAuthenticated(req);
    if (authResult.unauthorizedResponse) return authResult.unauthorizedResponse;

    const { searchParams } = new URL(req.url);
    const limit = parseBoundedInt(searchParams.get("limit"), {
      fallback: 100,
      min: 1,
      max: 500,
    });
    const offset = parseBoundedInt(searchParams.get("offset"), {
      fallback: 0,
      min: 0,
      max: 5000,
    });

    const notesSetting = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, "legacy_notes"))
      .limit(1)
      .then((rows) => rows[0]);

    const raw = notesSetting?.value;
    const notes = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as { notes?: unknown[] }).notes)
        ? (raw as { notes: unknown[] }).notes
        : [];

    const parsed = notes
      .map((item) => {
        const candidate =
          item && typeof item === "object"
            ? {
                id: String((item as Record<string, unknown>).id ?? crypto.randomUUID()),
                title: String((item as Record<string, unknown>).title ?? ""),
                body: String((item as Record<string, unknown>).body ?? ""),
                createdAt: String(
                  (item as Record<string, unknown>).createdAt ?? new Date().toISOString()
                ),
              }
            : null;

        if (!candidate) return null;
        const check = noteSchema.safeParse(candidate);
        return check.success ? check.data : null;
      })
      .filter((item): item is z.infer<typeof noteSchema> => Boolean(item));

    const sorted = parsed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const paginated = sorted.slice(offset, offset + limit);

    return NextResponse.json(paginated, {
      headers: {
        "X-Total-Count": String(sorted.length),
        "X-Limit": String(limit),
        "X-Offset": String(offset),
      },
    });
  } catch (error) {
    console.error("[GET /api/notes] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
