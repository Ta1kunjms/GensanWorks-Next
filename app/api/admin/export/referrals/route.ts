import { referralsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { ensureAdmin, readFormatFromUrl } from "@/lib/legacy-compat";
import { exportResponse } from "@/api/admin/export/_utils";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const format = readFormatFromUrl(req.url);
    const referrals = await db.select().from(referralsTable);

    return exportResponse(
      format,
      "referrals",
      referrals as unknown as Array<Record<string, unknown>>,
      "referrals"
    );
  } catch (error) {
    console.error("[GET /api/admin/export/referrals] Failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
