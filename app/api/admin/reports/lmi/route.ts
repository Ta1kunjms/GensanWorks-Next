export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function calculateAge(birthDateStr: string | null): number | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 1. Fetch Jobseekers within date range for supply aggregation
    let jobseekersQuery = supabaseAdmin.from("jobseekers").select("id, created_at, gender, civil_status, birth_date, is_pwd, is_ofw, is_four_ps, employment_status");
    if (startDate) jobseekersQuery = jobseekersQuery.gte("created_at", startDate);
    if (endDate) jobseekersQuery = jobseekersQuery.lte("created_at", endDate);

    const { data: jobseekers, error: jsError } = await jobseekersQuery;
    if (jsError) throw jsError;

    // 2. Fetch Jobs and their industry classifications/vacancies
    let jobsQuery = supabaseAdmin.from("jobs").select("id, created_at, vacancies, industry_code");
    if (startDate) jobsQuery = jobsQuery.gte("created_at", startDate);
    if (endDate) jobsQuery = jobsQuery.lte("created_at", endDate);

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError) throw jobsError;

    // 3. Fetch Referrals & Hires. We need jobseeker genders to split referrals/placements by gender.
    let referralsQuery = supabaseAdmin.from("referrals").select("id, created_at, status, jobseeker_id");
    if (startDate) referralsQuery = referralsQuery.gte("created_at", startDate);
    if (endDate) referralsQuery = referralsQuery.lte("created_at", endDate);

    const { data: referrals, error: refError } = await referralsQuery;
    if (refError) throw refError;

    // To prevent joining error, gather all jobseeker IDs in referrals and fetch their genders
    const refJobseekerIds = Array.from(new Set((referrals ?? []).map(r => r.jobseeker_id).filter(Boolean)));
    let refGendersMap = new Map<string, string>();
    
    if (refJobseekerIds.length > 0) {
      const { data: jsGenders } = await supabaseAdmin
        .from("jobseekers")
        .select("id, gender")
        .in("id", refJobseekerIds);
      
      jsGenders?.forEach(j => {
        refGendersMap.set(j.id, (j.gender || "Not Specified").trim());
      });
    }

    // --- AGGREGATIONS ---

    // A. Manpower Supply
    let supply = {
      total: jobseekers?.length ?? 0,
      gender: { male: 0, female: 0, other: 0 },
      civilStatus: { single: 0, married: 0, widowed: 0, separated: 0, other: 0 },
      ageGroup: { youth: 0, prime: 0, middle: 0, senior: 0, unknown: 0 },
      specialGroups: { pwd: 0, ofw: 0, fourPs: 0 },
      employmentStatus: { employed: 0, unemployed: 0, underemployed: 0, other: 0 }
    };

    jobseekers?.forEach(js => {
      // Gender mapping
      const gender = (js.gender || "").toLowerCase().trim();
      if (gender.includes("male") && !gender.includes("female")) supply.gender.male++;
      else if (gender.includes("female")) supply.gender.female++;
      else supply.gender.other++;

      // Civil Status mapping
      const civil = (js.civil_status || "").toLowerCase().trim();
      if (civil === "single") supply.civilStatus.single++;
      else if (civil === "married") supply.civilStatus.married++;
      else if (civil === "widowed") supply.civilStatus.widowed++;
      else if (civil === "separated" || civil === "divorced") supply.civilStatus.separated++;
      else supply.civilStatus.other++;

      // Age mapping
      const age = calculateAge(js.birth_date);
      if (age === null) {
        supply.ageGroup.unknown++;
      } else if (age >= 15 && age <= 24) {
        supply.ageGroup.youth++; // Youth (15-24)
      } else if (age >= 25 && age <= 34) {
        supply.ageGroup.prime++; // Prime working age (25-34)
      } else if (age >= 35 && age <= 44) {
        supply.ageGroup.middle++; // Mid-career (35-44)
      } else {
        supply.ageGroup.senior++; // Senior/Late career (45+)
      }

      // Special tags
      if (js.is_pwd) supply.specialGroups.pwd++;
      if (js.is_ofw) supply.specialGroups.ofw++;
      if (js.is_four_ps) supply.specialGroups.fourPs++;

      // Employment Status
      const emp = (js.employment_status || "").toLowerCase().trim();
      if (emp.includes("unemployed")) supply.employmentStatus.unemployed++;
      else if (emp.includes("underemployed")) supply.employmentStatus.underemployed++;
      else if (emp.includes("employed")) supply.employmentStatus.employed++;
      else supply.employmentStatus.other++;
    });

    // B. Manpower Demand (Vacancies Solicited)
    let demand = {
      totalJobsPosted: jobs?.length ?? 0,
      totalVacancies: 0,
      byIndustry: {} as Record<string, { code: string; label: string; jobsCount: number; vacanciesCount: number }>
    };

    const SRS_INDUSTRIES = [
      { code: "01", label: "Agriculture, Forestry & Fishing" },
      { code: "02", label: "Mining & Quarrying" },
      { code: "03", label: "Manufacturing" },
      { code: "04", label: "Electricity, Gas, Steam & Aircon Supply" },
      { code: "05", label: "Water Supply, Sewerage, Waste Management" },
      { code: "06", label: "Construction" },
      { code: "07", label: "Wholesale & Retail Trade; Repair of Motor Vehicles" },
      { code: "08", label: "Transportation & Storage" },
      { code: "09", label: "Accommodation & Food Service Activities" },
      { code: "10", label: "Information & Communication" },
      { code: "11", label: "Financial & Insurance Activities" },
      { code: "12", label: "Real Estate Activities" },
      { code: "13", label: "Professional, Scientific & Technical Activities" },
      { code: "14", label: "Administrative & Support Service Activities" },
      { code: "15", label: "Education" },
      { code: "16", label: "Human Health & Social Work Activities" },
      { code: "17", label: "Other Service Activities / Private Households" }
    ];

    SRS_INDUSTRIES.forEach(ind => {
      demand.byIndustry[ind.code] = {
        code: ind.code,
        label: ind.label,
        jobsCount: 0,
        vacanciesCount: 0
      };
    });

    // Set fallback bucket for missing industry codes
    demand.byIndustry["99"] = {
      code: "99",
      label: "Others / Undefined Industry",
      jobsCount: 0,
      vacanciesCount: 0
    };

    jobs?.forEach(job => {
      const vacancies = Number(job.vacancies ?? 1);
      demand.totalVacancies += vacancies;

      // Extract and match industry code
      let code = (job.industry_code || "").trim();
      if (!code || !demand.byIndustry[code]) {
        code = "99";
      }
      const sector = demand.byIndustry[code];
      if (sector) {
        sector.jobsCount++;
        sector.vacanciesCount += vacancies;
      }
    });

    // C. Employment Facilitation (Referrals & Placements)
    let facilitation = {
      referred: { total: referrals?.length ?? 0, male: 0, female: 0, other: 0 },
      placed: { total: 0, male: 0, female: 0, other: 0 },
      successRate: 0
    };

    referrals?.forEach(ref => {
      const gender = (refGendersMap.get(ref.jobseeker_id) || "").toLowerCase().trim();
      
      // Referral Gender breakdown
      if (gender.includes("male") && !gender.includes("female")) facilitation.referred.male++;
      else if (gender.includes("female")) facilitation.referred.female++;
      else facilitation.referred.other++;

      // Check if placed (status is Hired)
      if (ref.status === "Hired") {
        facilitation.placed.total++;
        if (gender.includes("male") && !gender.includes("female")) facilitation.placed.male++;
        else if (gender.includes("female")) facilitation.placed.female++;
        else facilitation.placed.other++;
      }
    });

    facilitation.successRate = facilitation.referred.total > 0
      ? Math.round((facilitation.placed.total / facilitation.referred.total) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      data: {
        supply,
        demand,
        facilitation
      }
    });

  } catch (error) {
    console.error("LMI aggregation API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
