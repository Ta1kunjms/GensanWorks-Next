export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { parseBoundedInt } from "@/lib/api-guardrails";
import { ensureAdmin } from "@/lib/legacy-compat";
import { buildLegacyActivities } from "@/api/admin/activities/_events";

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const { searchParams } = new URL(req.url);
    const limit = parseBoundedInt(searchParams.get("limit"), {
      fallback: 100,
      min: 1,
      max: 500,
    });

    const { userId } = await context.params;
    const activities = await buildLegacyActivities(500);

    return NextResponse.json({
      activities: activities.filter((item) => item.userId === userId).slice(0, limit),
    });
  } catch (error) {
    console.error("[GET /api/admin/activities/user/[userId]] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
