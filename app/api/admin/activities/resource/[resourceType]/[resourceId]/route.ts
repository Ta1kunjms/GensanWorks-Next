export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/legacy-compat";
import { buildLegacyActivities } from "@/api/admin/activities/_events";

export async function GET(
  req: Request,
  context: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const { resourceType, resourceId } = await context.params;
    const activities = await buildLegacyActivities(500);

    return NextResponse.json({
      activities: activities.filter(
        (item) => item.resourceType === resourceType && item.resourceId === resourceId
      ),
    });
  } catch (error) {
    console.error("[GET /api/admin/activities/resource/[resourceType]/[resourceId]] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
