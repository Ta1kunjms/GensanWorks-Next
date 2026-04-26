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
      .from("users")
      .select("*")
      .limit(10000);
    const applicants = result.data ?? [];

    return exportResponse(
      format,
      "applicants",
      applicants as unknown as Array<Record<string, unknown>>,
      "applicants"
    );
  } catch (error) {
    console.error("[GET /api/admin/export/applicants] Failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}