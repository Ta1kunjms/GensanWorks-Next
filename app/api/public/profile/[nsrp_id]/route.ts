export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nsrp_id: string }> }
) {
  const { nsrp_id } = await params;

  // Require authenticated employer or admin
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["employer", "admin", "jobseeker"].includes(user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Look up by nsrp_id OR user_id (UUID fallback)
  const isUuid = /^[0-9a-f-]{36}$/i.test(nsrp_id);

  const { data: jsProfile } = await supabaseAdmin
    .from("jobseekers")
    .select("*")
    .eq(isUuid ? "id" : "nsrp_id", nsrp_id)
    .maybeSingle();

  if (!jsProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Jobseeker can only view their own profile
  if (user.role === "jobseeker" && jsProfile.id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch base user
  const { data: userRecord } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .eq("id", jsProfile.id)
    .maybeSingle();

  // Build response
  const response = {
    userId: jsProfile.id,
    nsrpId: jsProfile.nsrp_id ?? null,
    name: userRecord?.name ?? "",
    email: userRecord?.email ?? "",
    age: jsProfile.age ?? null,
    sex: jsProfile.sex ?? null,
    address: jsProfile.address ?? null,
    city: jsProfile.city ?? null,
    contactNumber: jsProfile.contact_number ?? null,
    jobSeekingStatus: jsProfile.job_seeking_status ?? "not_looking",
    educationLevel: jsProfile.education_level ?? null,
    yearsExperience: jsProfile.years_experience ?? null,
    skills: Array.isArray(jsProfile.skills) ? jsProfile.skills : [],
    languages: Array.isArray(jsProfile.languages) ? jsProfile.languages : [],
    workSetupPreference: jsProfile.work_setup_preference ?? null,
    expectedSalaryMin: jsProfile.expected_salary_min ?? null,
    expectedSalaryMax: jsProfile.expected_salary_max ?? null,
    preferredWorkLocation: jsProfile.preferred_work_location ?? null,
    certifications: jsProfile.certifications ?? [],
    workExperience: jsProfile.work_experience ?? [],
    education: jsProfile.education_history ?? [],
    pwdStatus: jsProfile.pwd_status ?? false,
    disabilityType: jsProfile.disability_type ?? null,
    profilePhoto: jsProfile.profile_photo_url ?? null,
    profileCompleteness: jsProfile.profile_completeness ?? 0,
  };

  return NextResponse.json(response);
}
