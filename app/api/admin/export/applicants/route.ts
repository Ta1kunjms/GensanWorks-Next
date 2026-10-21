export const dynamic = "force-dynamic";
import { ensureAdmin, readFormatFromUrl } from "@/lib/legacy-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { exportResponse } from "@/api/admin/export/_utils";

// Explicit columns: no password_hash and no sensitive personal fields
// (religion, disability, civil status) in a bulk export.
const APPLICANT_EXPORT_COLUMNS =
  "id, nsrp_id, first_name, middle_name, last_name, suffix, email, phone, city, province, " +
  "employment_status, job_seeking_status, is_active, created_at";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const format = readFormatFromUrl(req.url);
    const result = await supabaseAdmin
      .from("jobseekers")
      .select(APPLICANT_EXPORT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (result.error) throw result.error;
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
