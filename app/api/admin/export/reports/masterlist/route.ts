export const dynamic = "force-dynamic";
import { ensureAdmin, readFormatFromUrl } from "@/lib/legacy-compat";
import { supabaseAdmin } from "@/lib/supabase";
import { exportResponse } from "@/api/admin/export/_utils";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const format = readFormatFromUrl(req.url) ?? "csv";
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";

    const [
      employersResult,
      jobsResult,
      usersResult,
      applicationsResult,
      referralsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("employers")
        .select(
          "id, establishment_name, address, contact_person, contact_email, contact_phone, industry, account_status, created_at"
        ),
      supabaseAdmin
        .from("jobs")
        .select(
          "id, employer_id, position_title, description, location, employment_type, salary_min, salary_max, status, created_at"
        ),
      supabaseAdmin.from("users").select("id, full_name, email, phone, created_at"),
      supabaseAdmin
        .from("applications")
        .select("id, job_id, applicant_id, status, created_at"),
      supabaseAdmin.from("referrals").select("id, status, created_at"),
    ]);

    if (type === "employers" || type === "all") {
      const employers = (employersResult.data ?? []).map((emp) => ({
        id: emp.id,
        name: emp.establishment_name,
        address: emp.address,
        contact_person: emp.contact_person,
        contact_email: emp.contact_email,
        contact_phone: emp.contact_phone,
        industry: emp.industry,
        status: emp.account_status,
        created_at: emp.created_at,
      }));

      if (type === "employers") {
        return exportResponse(format, "employers", employers as unknown as Array<Record<string, unknown>>, "masterlist-employers");
      }
    }

    if (type === "jobs" || type === "all") {
      const jobs = (jobsResult.data ?? []).map((job) => ({
        id: job.id,
        employer_id: job.employer_id,
        position_title: job.position_title,
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        status: job.status,
        created_at: job.created_at,
      }));

      if (type === "jobs") {
        return exportResponse(format, "jobs", jobs as unknown as Array<Record<string, unknown>>, "masterlist-jobs");
      }
    }

    if (type === "jobseekers" || type === "all") {
      const jobseekers = (usersResult.data ?? []).map((user) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
      }));

      if (type === "jobseekers") {
        return exportResponse(format, "jobseekers", jobseekers as unknown as Array<Record<string, unknown>>, "masterlist-jobseekers");
      }
    }

    if (type === "all") {
      return exportResponse(
        format,
        "masterlist",
        {
          employers: (employersResult.data ?? []).map((e) => ({
            type: "employer",
            id: e.id,
            name: e.establishment_name,
            details: e.address,
          })),
          jobs: (jobsResult.data ?? []).map((j) => ({
            type: "job",
            id: j.id,
            name: j.position_title,
            details: j.location,
          })),
          jobseekers: (usersResult.data ?? []).map((u) => ({
            type: "jobseeker",
            id: u.id,
            name: u.full_name,
            details: u.email,
          })),
        } as unknown as Array<Record<string, unknown>>,
        "masterlist-all"
      );
    }

    return Response.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/admin/export/reports/masterlist] Failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}