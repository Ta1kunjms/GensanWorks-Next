export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

// ── Types ────────────────────────────────────────────────────────────────
type ScoreBreakdown = {
  skills_match: number;
  experience_relevance: number;
  education_fit: number;
  location_match: number;
  salary_alignment: number;
  work_setup_match: number;
  certifications_bonus: number;
};

type AIScoreResult = {
  suitability_score: number;
  score_breakdown: ScoreBreakdown;
  top_reasons: string[];
  bias_flags: string[];
  ai_summary: string;
};

// ── GET /api/admin/matching/[job_id] — Fetch existing scores ──────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id } = await params;

  // Fetch the job
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, employers(establishment_name)")
    .eq("id", job_id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Fetch existing scores
  const { data: scores } = await supabaseAdmin
    .from("job_match_scores")
    .select("id, jobseeker_id, suitability_score, score_breakdown, top_reasons, bias_flags, ai_summary, computed_at, sent_to_employer")
    .eq("job_id", job_id)
    .order("suitability_score", { ascending: false })
    .limit(100);

  if (!scores || scores.length === 0) {
    return NextResponse.json({
      job,
      scores: [],
      totalScored: 0,
      lastComputedAt: null,
      sentToEmployer: false,
    });
  }

  // Enrich with jobseeker names
  const jobseekerIds = scores.map((s) => s.jobseeker_id as string);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", jobseekerIds);

  const { data: profiles } = await supabaseAdmin
    .from("jobseekers")
    .select("user_id, nsrp_id, job_seeking_status, contact_number")
    .in("user_id", jobseekerIds);

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));

  const enrichedScores = scores.map((score, idx) => {
    const user = userMap.get(score.jobseeker_id as string);
    const profile = profileMap.get(score.jobseeker_id as string);
    return {
      rank: idx + 1,
      jobseekerId: score.jobseeker_id,
      name: user?.name ?? "Unknown",
      email: user?.email ?? "",
      nsrpId: profile?.nsrp_id ?? null,
      jobSeekingStatus: profile?.job_seeking_status ?? "not_looking",
      suitabilityScore: score.suitability_score,
      scoreBreakdown: score.score_breakdown,
      topReasons: score.top_reasons,
      biasFlags: score.bias_flags,
      aiSummary: score.ai_summary,
      computedAt: score.computed_at,
      sentToEmployer: score.sent_to_employer,
    };
  });

  return NextResponse.json({
    job,
    scores: enrichedScores,
    totalScored: enrichedScores.length,
    lastComputedAt: scores[0]?.computed_at ?? null,
    sentToEmployer: scores.some((s) => s.sent_to_employer),
  });
}

// ── POST /api/admin/matching/[job_id] — Trigger AI scoring ───────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id } = await params;

  // Fetch job
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, description, qualifications, required_skills, education_level, years_experience, city, salary_min, salary_max, work_setup")
    .eq("id", job_id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Fetch all active jobseekers
  const { data: jobseekers } = await supabaseAdmin
    .from("jobseekers")
    .select(`
      user_id, nsrp_id, age, sex, address, city,
      education_level, years_experience, skills,
      preferred_work_location, work_setup_preference,
      expected_salary_min, expected_salary_max,
      job_seeking_status
    `)
    .in("job_seeking_status", ["actively_looking", "open"]);

  if (!jobseekers || jobseekers.length === 0) {
    return NextResponse.json({ message: "No active jobseekers found in pool", scored: 0 });
  }

  // AI Scoring — batch scored using rule-based scoring as fallback if no AI key
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const scored: (AIScoreResult & { jobseekerId: string })[] = [];

  for (const js of jobseekers) {
    try {
      let result: AIScoreResult;

      if (geminiKey) {
        // Call Gemini Pro for structured scoring
        result = await scoreWithGemini(job, js, geminiKey);
      } else {
        // Fallback: rule-based scoring
        result = ruleBasedScore(job, js);
      }

      scored.push({ ...result, jobseekerId: js.user_id });
    } catch {
      // Fallback silently on per-jobseeker error
      scored.push({ ...ruleBasedScore(job, js), jobseekerId: js.user_id });
    }
  }

  // Upsert all scores
  const now = new Date().toISOString();
  const upsertRows = scored.map((s) => ({
    job_id,
    jobseeker_id: s.jobseekerId,
    suitability_score: s.suitability_score,
    score_breakdown: s.score_breakdown,
    top_reasons: s.top_reasons,
    bias_flags: s.bias_flags,
    ai_summary: s.ai_summary,
    computed_at: now,
    updated_at: now,
  }));

  await supabaseAdmin
    .from("job_match_scores")
    .upsert(upsertRows, { onConflict: "job_id,jobseeker_id" });

  return NextResponse.json({ success: true, scored: scored.length, computedAt: now });
}

// ── PATCH /api/admin/matching/[job_id] — Send report to employer ─────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id } = await params;
  const body = await req.json() as { employerId: string };
  const { employerId } = body;

  if (!employerId) return NextResponse.json({ error: "employerId required" }, { status: 400 });

  // Mark all scores for this job as sent
  await supabaseAdmin
    .from("job_match_scores")
    .update({ sent_to_employer: true, sent_at: new Date().toISOString() })
    .eq("job_id", job_id);

  // Get job title
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("position_title")
    .eq("id", job_id)
    .single();

  // Notify employer
  await tryCreateNotification({
    userId: employerId,
    role: "employer",
    type: "matching_report",
    title: "AI Suitability Matching Report Ready",
    message: `Your AI matching report for "${job?.position_title ?? "your job posting"}" is now available. View ranked candidates by suitability score.`,
    relatedId: job_id,
    relatedType: "job",
  });

  return NextResponse.json({ success: true });
}

// ── Rule-based scoring (fallback / when no AI key) ───────────────────────
function ruleBasedScore(
  job: Record<string, unknown>,
  js: Record<string, unknown>
): AIScoreResult {
  const skillsScore = computeSkillsMatch(
    (job.required_skills as string[] ?? []),
    (js.skills as string[] ?? [])
  );
  const expScore = computeExperienceScore(
    (job.years_experience as number ?? 0),
    (js.years_experience as number ?? 0)
  );
  const eduScore = computeEducationScore(
    job.education_level as string ?? "",
    js.education_level as string ?? "",
    js.years_experience as number ?? 0
  );
  const locationScore = (job.city as string ?? "") === (js.city as string ?? "") ? 100 : 60;
  const salaryScore = computeSalaryScore(
    job.salary_min as number ?? 0,
    job.salary_max as number ?? 0,
    js.expected_salary_min as number ?? 0,
    js.expected_salary_max as number ?? 0
  );
  const workSetupScore = (job.work_setup as string ?? "onsite") === (js.work_setup_preference as string ?? "onsite") ? 100 : 60;
  const certsBonus = 0; // Rule-based doesn't compute certs

  const breakdown: ScoreBreakdown = {
    skills_match: skillsScore,
    experience_relevance: expScore,
    education_fit: eduScore,
    location_match: locationScore,
    salary_alignment: salaryScore,
    work_setup_match: workSetupScore,
    certifications_bonus: certsBonus,
  };

  const overall = Math.round(
    breakdown.skills_match * 0.30 +
    breakdown.experience_relevance * 0.25 +
    breakdown.education_fit * 0.10 +
    breakdown.location_match * 0.10 +
    breakdown.salary_alignment * 0.08 +
    breakdown.work_setup_match * 0.07 +
    breakdown.certifications_bonus * 0.10
  );

  const reasons: string[] = [];
  if (skillsScore >= 80) reasons.push(`Strong skills match (${skillsScore}%)`);
  if (expScore >= 80) reasons.push(`Relevant work experience`);
  if (locationScore >= 100) reasons.push(`Location preference matches`);

  const biasFlags: string[] = [];
  if (expScore >= 80 && eduScore < 60) {
    biasFlags.push("Experience compensates for education gap — weighted accordingly");
  }

  return {
    suitability_score: Math.max(0, Math.min(100, overall)),
    score_breakdown: breakdown,
    top_reasons: reasons.length > 0 ? reasons : ["Profile evaluated against job requirements"],
    bias_flags: biasFlags,
    ai_summary: `Suitability score: ${overall}%. Rule-based evaluation.`,
  };
}

function computeSkillsMatch(required: string[], candidate: string[]): number {
  if (!required.length) return 70;
  const reqLower = required.map((s) => s.toLowerCase());
  const canLower = candidate.map((s) => s.toLowerCase());
  const matched = reqLower.filter((r) => canLower.some((c) => c.includes(r) || r.includes(c))).length;
  return Math.round((matched / reqLower.length) * 100);
}

function computeExperienceScore(required: number, candidate: number): number {
  if (required === 0) return 80;
  if (candidate >= required) return 100;
  if (candidate >= required * 0.7) return 80;
  if (candidate >= required * 0.4) return 60;
  return 40;
}

function computeEducationScore(required: string, candidate: string, yearsExp: number): number {
  const levels: Record<string, number> = {
    "no formal education": 1, "elementary": 2, "high school": 3,
    "vocational": 4, "college": 5, "bachelor": 5, "master": 6, "doctorate": 7, "phd": 7
  };
  const reqLevel = levels[required?.toLowerCase()] ?? 0;
  const canLevel = levels[candidate?.toLowerCase()] ?? 0;

  if (canLevel >= reqLevel) return 100;
  // Bias: 5+ years experience compensates for education gap
  if (yearsExp >= 5) return Math.max(70, (canLevel / Math.max(reqLevel, 1)) * 100);
  return Math.round((canLevel / Math.max(reqLevel, 1)) * 100);
}

function computeSalaryScore(jobMin: number, jobMax: number, jsMin: number, jsMax: number): number {
  if (!jobMin && !jobMax) return 80;
  if (!jsMin && !jsMax) return 70;
  const jobMid = (jobMin + jobMax) / 2;
  const jsMid = (jsMin + jsMax) / 2;
  if (jsMid <= jobMax && jsMid >= jobMin) return 100;
  const diff = Math.abs(jsMid - jobMid) / jobMid;
  if (diff < 0.1) return 90;
  if (diff < 0.25) return 70;
  if (diff < 0.5) return 50;
  return 30;
}

// ── Gemini AI scoring (when API key is set) ──────────────────────────────
async function scoreWithGemini(
  job: Record<string, unknown>,
  js: Record<string, unknown>,
  apiKey: string
): Promise<AIScoreResult> {
  const prompt = `You are an unbiased HR matching AI for the PESO government employment office.
Score this jobseeker's suitability for the job on a scale of 0-100.

CRITICAL BIAS RULE: Do NOT penalize candidates heavily for lacking a formal degree if they demonstrate equivalent experience or certifications. A candidate with 5+ years of directly relevant experience should score no less than 70 on education_fit regardless of degree status.

JOB:
- Title: ${job.position_title}
- Required Skills: ${JSON.stringify(job.required_skills)}
- Education Required: ${job.education_level}
- Experience Required: ${job.years_experience} years
- Location: ${job.city}
- Work Setup: ${job.work_setup}
- Salary Range: PHP ${job.salary_min} - ${job.salary_max}

JOBSEEKER:
- Skills: ${JSON.stringify(js.skills)}
- Education: ${js.education_level}
- Experience: ${js.years_experience} years
- Location: ${js.city}
- Work Setup Preference: ${js.work_setup_preference}
- Expected Salary: PHP ${js.expected_salary_min} - ${js.expected_salary_max}

Respond ONLY with a valid JSON object in this exact format:
{
  "suitability_score": <number 0-100>,
  "score_breakdown": {
    "skills_match": <0-100>,
    "experience_relevance": <0-100>,
    "education_fit": <0-100>,
    "location_match": <0-100>,
    "salary_alignment": <0-100>,
    "work_setup_match": <0-100>,
    "certifications_bonus": <0-20>
  },
  "top_reasons": ["reason1", "reason2", "reason3"],
  "bias_flags": ["any bias adjustments made"],
  "ai_summary": "one sentence summary"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    }
  );

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");

  return JSON.parse(jsonMatch[0]) as AIScoreResult;
}
