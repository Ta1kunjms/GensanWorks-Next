import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: scores, error } = await supabaseAdmin
    .from("job_match_scores")
    .select(
      "id, jobseeker_id, utility_score, grade, suitability_score, dimension_scores, summary, strengths, gaps, bias_flags, constraint_violations, score_breakdown, top_reasons, ai_summary, computed_at, sent_to_employer, score_version, prompt_hash, parameter_fingerprint, semantic_pairs_reviewed"
    )
    .limit(1);

  console.log("Error:", error);
  console.log("Scores length:", scores?.length);
}

run();
