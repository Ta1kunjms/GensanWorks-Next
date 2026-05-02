export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, profile, resume } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "jobseeker", first_name: profile.firstName, last_name: profile.lastName },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create auth user" }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into jobseekers table
    const jobseekerPayload = {
      id: userId,
      email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      middle_name: profile.middleName,
      suffix: profile.suffix,
      phone: profile.phone,
      birth_date: profile.birthDate ? new Date(profile.birthDate).toISOString() : null,
      gender: profile.gender,
      religion: profile.religion,
      civil_status: profile.civilStatus,
      tin: profile.tin,
      height: profile.height,
      
      is_pwd: profile.isPwd,
      disability_visual: profile.disabilityVisual,
      disability_speech: profile.disabilitySpeech,
      disability_mental: profile.disabilityMental,
      disability_hearing: profile.disabilityHearing,
      disability_physical: profile.disabilityPhysical,
      disability_others: profile.disabilityOthers,

      house_number: profile.houseNumber,
      barangay: profile.barangay,
      city: profile.city,
      province: profile.province,
      zip_code: profile.zipCode,

      employment_status: profile.employmentStatus,
      employment_type: profile.employmentType,
      self_employed_type: profile.selfEmployedType,
      self_employed_type_others: profile.selfEmployedTypeOthers,
      unemployed_reason: profile.unemployedReason,
      unemployed_months: profile.unemployedMonths,
      unemployed_due_to_calamity: profile.unemployedDueToCalamity,
      terminated_country: profile.terminatedCountry,
      terminated_reason: profile.terminatedReason,

      is_ofw: profile.isOfw,
      ofw_country: profile.ofwCountry,
      is_former_ofw: profile.isFormerOfw,
      former_ofw_country: profile.formerOfwCountry,
      former_ofw_return_month_year: profile.formerOfwReturnMonthYear,

      is_four_ps: profile.isFourPs,
      household_id_no: profile.householdIdNo,

      preference_part_time: profile.preferencePartTime,
      preference_full_time: profile.preferenceFullTime,
      preferred_occupation_1: profile.preferredOccupation1,
      preferred_occupation_2: profile.preferredOccupation2,
      preferred_occupation_3: profile.preferredOccupation3,

      preferred_work_location_local_1: profile.preferredWorkLocationLocal1,
      preferred_work_location_local_2: profile.preferredWorkLocationLocal2,
      preferred_work_location_local_3: profile.preferredWorkLocationLocal3,
      preferred_work_location_overseas_1: profile.preferredWorkLocationOverseas1,
      preferred_work_location_overseas_2: profile.preferredWorkLocationOverseas2,
      preferred_work_location_overseas_3: profile.preferredWorkLocationOverseas3,

      other_skills: profile.otherSkills,
      other_skills_others: profile.otherSkillsOthers,
      profile_image: profile.profileImage,

      profile_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: jobseekerError } = await supabaseAdmin
      .from("jobseekers")
      .insert(jobseekerPayload);

    if (jobseekerError) {
      console.error("Jobseeker insert error:", jobseekerError);
      // Rollback auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create jobseeker profile" }, { status: 500 });
    }

    // 3. Insert resume records
    if (resume) {
      if (resume.education && resume.education.length > 0) {
        await supabaseAdmin.from("jobseeker_education").insert(
          resume.education.map((e: any) => ({
            jobseeker_id: userId,
            school_name: e.school_name,
            degree: e.degree,
            field_of_study: e.field_of_study,
            start_date: e.start_date ? new Date(e.start_date).toISOString() : null,
            end_date: e.end_date ? new Date(e.end_date).toISOString() : null,
            is_current: e.is_current || false,
            description: e.description,
          }))
        );
      }

      if (resume.experience && resume.experience.length > 0) {
        await supabaseAdmin.from("jobseeker_experience").insert(
          resume.experience.map((e: any) => ({
            jobseeker_id: userId,
            company_name: e.company_name,
            position_title: e.position_title,
            start_date: e.start_date ? new Date(e.start_date).toISOString() : null,
            end_date: e.end_date ? new Date(e.end_date).toISOString() : null,
            is_current: e.is_current || false,
            description: e.description,
          }))
        );
      }

      if (resume.trainings && resume.trainings.length > 0) {
        await supabaseAdmin.from("jobseeker_trainings").insert(
          resume.trainings.map((t: any) => ({
            jobseeker_id: userId,
            training_title: t.training_title,
            institution: t.institution,
            date_completed: t.date_completed ? new Date(t.date_completed).toISOString() : null,
            certificate_url: t.certificate_url,
          }))
        );
      }

      if (resume.licenses && resume.licenses.length > 0) {
        await supabaseAdmin.from("jobseeker_licenses").insert(
          resume.licenses.map((l: any) => ({
            jobseeker_id: userId,
            license_name: l.license_name,
            license_number: l.license_number,
            date_expiry: l.date_expiry ? new Date(l.date_expiry).toISOString() : null,
            image_url: l.image_url,
          }))
        );
      }

      if (resume.languages && resume.languages.length > 0) {
        await supabaseAdmin.from("jobseeker_languages").insert(
          resume.languages.map((l: any) => ({
            jobseeker_id: userId,
            language: l.language,
            proficiency: l.proficiency,
          }))
        );
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    console.error("Admin jobseeker creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
