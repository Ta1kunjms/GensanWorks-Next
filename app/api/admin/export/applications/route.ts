export const dynamic = "force-dynamic";
import { ensureAdmin, readFormatFromUrl } from "@/lib/legacy-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { exportResponse } from "@/api/admin/export/_utils";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const format = readFormatFromUrl(req.url);
    const result = await supabaseAdmin
      .from("applications")
      .select("*")
      .limit(10000);
    const applications = result.data ?? [];

    return exportResponse(
      format,
      "applications",
      applications as unknown as Array<Record<string, unknown>>,
      "applications"
    );
  } catch (error) {
    console.error("[GET /api/admin/export/applications] Failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}