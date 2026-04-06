import { NextResponse } from "next/server";
import { parseBoundedInt } from "@/lib/api-guardrails";
import { ensureAdmin } from "@/lib/legacy-compat";
import { buildLegacyActivities } from "@/api/admin/activities/_events";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const { searchParams } = new URL(req.url);
    const limit = parseBoundedInt(searchParams.get("limit"), {
      fallback: 50,
      min: 1,
      max: 500,
    });
    const offset = parseBoundedInt(searchParams.get("offset"), {
      fallback: 0,
      min: 0,
      max: 5000,
    });

    const activities = await buildLegacyActivities(Math.max(limit + offset, 100));

    return NextResponse.json({
      activities: activities.slice(offset, offset + limit),
      total: activities.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/admin/activities] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
