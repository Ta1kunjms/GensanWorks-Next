export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/postgrest-safe";

// Explicit columns only: never password_hash, TIN, religion, household id, etc.
const PROFILE_COLUMNS =
  "id, nsrp_id, first_name, middle_name, last_name, suffix, email, phone, birth_date, gender, " +
  "barangay, city, province, job_seeking_status, employment_status, other_skills, " +
  "preferred_occupation_1, preferred_work_location_local, preferred_work_location_local_1, " +
  "preference_full_time, preference_part_time, is_pwd, pwd_type, profile_image, profile_completeness, is_active";

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function skillList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : (v as { name?: string; skill?: string })?.name ?? (v as { skill?: string })?.skill ?? ""))
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** True when this employer may see the jobseeker: an application or referral links them to one of its jobs. */
async function employerMayView(employerId: string, jobseekerId: string): Promise<boolean> {
  const { data: employer } = await supabaseAdmin
    .from("employers")
    .select("account_status, is_active")
    .eq("id", employerId)
    .maybeSingle();
  if (!employer || employer.is_active === false || employer.account_status !== "approved") return false;

  const [apps, refs] = await Promise.all([
    supabaseAdmin.from("applications").select("id", { count: "exact", head: true }).eq("employer_id", employerId).eq("jobseeker_id", jobseekerId),
    supabaseAdmin.from("referrals").select("id", { count: "exact", head: true }).eq("employer_id", employerId).eq("jobseeker_id", jobseekerId),
  ]);
  return (apps.count ?? 0) > 0 || (refs.count ?? 0) > 0;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nsrp_id: string }> }
) {
  const { nsrp_id } = await params;

  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["employer", "admin", "jobseeker"].includes(user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Look up by UUID or by NSRP id (letters, digits and dashes only).
  const byId = isUuid(nsrp_id);
  if (!byId && !/^[A-Za-z0-9-]{1,40}$/.test(nsrp_id)) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: js, error } = await supabaseAdmin
    .from("jobseekers")
    .select(PROFILE_COLUMNS)
    .eq(byId ? "id" : "nsrp_id", nsrp_id)
    .maybeSingle();
  if (error) {
    console.error("[GET /api/public/profile] lookup failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  const notFound = NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (!js) return notFound;

  const profile = js as unknown as Record<string, unknown>;
  const jobseekerId = String(profile.id);

  // Authorization: admin; the jobseeker themself; or an approved employer the
  // jobseeker applied/was referred to. Everyone else gets "not found".
  const isSelf = user.role === "jobseeker" && jobseekerId === user.id;
  if (user.role === "jobseeker" && !isSelf) return notFound;
  if (user.role === "employer" && !(await employerMayView(user.id, jobseekerId))) return notFound;

  const [edu, exp, langs, certs] = await Promise.all([
    supabaseAdmin.from("jobseeker_education").select("level, course, school_name, year_graduated").eq("jobseeker_id", jobseekerId),
    supabaseAdmin.from("jobseeker_experience").select("company_name, position, number_of_months, responsibilities").eq("jobseeker_id", jobseekerId),
    supabaseAdmin.from("jobseeker_languages").select("language").eq("jobseeker_id", jobseekerId),
    supabaseAdmin.from("jobseeker_licenses").select("eligibility, professional_license, date_taken").eq("jobseeker_id", jobseekerId),
  ]);

  const name = [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
    .filter((p) => typeof p === "string" && p.trim())
    .map((p) => String(p).trim())
    .join(" ");
  const educationRows = edu.data ?? [];
  const experienceRows = exp.data ?? [];
  const totalMonths = experienceRows.reduce((sum, r) => sum + (Number(r.number_of_months) || 0), 0);
  // Disability information is sensitive: visible to PESO admins and the jobseeker only.
  const maySeeSensitive = user.role === "admin" || isSelf;

  return NextResponse.json({
    userId: jobseekerId,
    nsrpId: profile.nsrp_id ?? null,
    name,
    email: profile.email ?? "",
    age: maySeeSensitive ? ageFrom(profile.birth_date as string | null) : null,
    sex: maySeeSensitive ? profile.gender ?? null : null,
    address: [profile.barangay, profile.city, profile.province].filter(Boolean).join(", ") || null,
    city: profile.city ?? null,
    contactNumber: profile.phone ?? null,
    jobSeekingStatus: profile.job_seeking_status ?? "not_looking",
    educationLevel: educationRows[0]?.level ?? null,
    yearsExperience: totalMonths ? Math.round((totalMonths / 12) * 10) / 10 : null,
    skills: skillList(profile.other_skills),
    languages: (langs.data ?? []).map((l) => l.language).filter(Boolean),
    workSetupPreference: profile.preference_full_time ? "full-time" : profile.preference_part_time ? "part-time" : null,
    expectedSalaryMin: null,
    expectedSalaryMax: null,
    preferredWorkLocation: profile.preferred_work_location_local_1 ?? profile.preferred_work_location_local ?? null,
    certifications: (certs.data ?? []).map((c) => ({
      name: c.professional_license || c.eligibility || "",
      issuer: c.eligibility && c.professional_license ? c.eligibility : "",
      year: c.date_taken ? new Date(c.date_taken).getFullYear() : undefined,
    })).filter((c) => c.name),
    workExperience: experienceRows.map((r) => ({
      company: r.company_name,
      position: r.position,
      startDate: "",
      endDate: r.number_of_months ? `${r.number_of_months} months` : undefined,
      description: r.responsibilities ?? undefined,
    })),
    education: educationRows.map((r) => ({
      school: r.school_name ?? "",
      degree: [r.level, r.course].filter(Boolean).join(" — "),
      yearGraduated: r.year_graduated ? Number(r.year_graduated) || undefined : undefined,
    })),
    pwdStatus: maySeeSensitive ? Boolean(profile.is_pwd) : false,
    disabilityType: maySeeSensitive ? profile.pwd_type ?? null : null,
    profilePhoto: profile.profile_image ?? null,
    profileCompleteness: profile.profile_completeness ?? 0,
  });
}
