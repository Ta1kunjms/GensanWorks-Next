/*
  ============================================================
  ONE-TIME ADMIN BACKFILL — LOCAL/DEV USE ONLY
  Safe to re-run multiple times (idempotent — deterministic scoring).
  Updates ONLY matching_completeness_pct.
  Never touches profile_completeness, profile_complete, or any
  matching-engine scoring field.
  ============================================================
*/

import { supabaseAdmin } from "../app/lib/supabase";
import { computeMatchingCompleteness } from "../app/lib/matching/scoring-engine";

// Batch size for PostgREST range queries
const BATCH_SIZE = 50;

async function backfillMatchingCompleteness() {
  console.log("=== Backfilling matching_completeness_pct ===");
  console.log("Using supabaseAdmin (SERVICE_ROLE_KEY) — RLS bypassed.\n");

  // Verify the column exists before starting
  const { error: schemaCheckError } = await supabaseAdmin
    .from("jobseekers")
    .select("matching_completeness_pct")
    .limit(1);

  if (schemaCheckError) {
    console.error(
      "❌ Schema check failed — matching_completeness_pct may not exist:",
      schemaCheckError.message
    );
    console.error("Run the migration first: supabase/migrations/20260828190000_add_matching_completeness_pct.sql");
    process.exit(1);
  }
  console.log("✅ Schema check passed — column matching_completeness_pct exists.\n");

  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let aiCompatibleCount = 0;
  let incompleteCount = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching rows ${offset}–${offset + BATCH_SIZE - 1}...`);

    // Fetch with all five related tables that deidentifyJobseeker() reads:
    //   other_skills        → raw.other_skills
    //   jobseeker_experience → raw.jobseeker_experience
    //   jobseeker_education  → raw.jobseeker_education
    //   jobseeker_trainings  → raw.jobseeker_trainings  ← required for certifications
    //   jobseeker_licenses   → raw.jobseeker_licenses
    //   jobseeker_languages  → raw.jobseeker_languages
    const { data: seekers, error: fetchError } = await supabaseAdmin
      .from("jobseekers")
      .select(`
        *,
        other_skills(*),
        jobseeker_experience(*),
        jobseeker_education(*),
        jobseeker_trainings(*),
        jobseeker_licenses(*),
        jobseeker_languages(*)
      `)
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchError) {
      console.error(`❌ Fetch error at offset ${offset}:`, fetchError.message);
      totalErrors += 1;
      hasMore = false;
      break;
    }

    // Empty result → all rows processed
    if (!seekers || seekers.length === 0) {
      console.log("No more rows. Batching complete.");
      hasMore = false;
      break;
    }

    console.log(`  Processing ${seekers.length} jobseekers...`);

    for (const seeker of seekers) {
      totalProcessed += 1;
      try {
        // Pass the fully joined row directly — property names match RawJobseeker exactly
        const scorePct = computeMatchingCompleteness(seeker as Record<string, any>);

        if (scorePct >= 60) {
          aiCompatibleCount += 1;
        } else {
          incompleteCount += 1;
        }

        const { error: updateError } = await supabaseAdmin
          .from("jobseekers")
          .update({ matching_completeness_pct: scorePct })
          .eq("id", seeker.id);

        if (updateError) {
          console.error(`  ❌ Update failed for ${seeker.id}:`, updateError.message);
          totalErrors += 1;
        } else {
          totalUpdated += 1;
        }
      } catch (err: any) {
        console.error(`  ❌ Score error for ${seeker.id}:`, err.message);
        totalErrors += 1;
      }
    }

    // Terminate on final partial batch; advance offset otherwise
    if (seekers.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  const aiCompatibleRate =
    totalProcessed > 0
      ? ((aiCompatibleCount / totalProcessed) * 100).toFixed(1)
      : "0.0";

  console.log("\n================ BACKFILL SUMMARY ================");
  console.log(`Total Jobseekers Processed:  ${totalProcessed}`);
  console.log(`Total Jobseekers Updated:    ${totalUpdated}`);
  console.log(`Total Errors:                ${totalErrors}`);
  console.log("--------------------------------------------------");
  console.log(`AI-Compatible (>= 60%):      ${aiCompatibleCount}`);
  console.log(`Incomplete (< 60%):          ${incompleteCount}`);
  console.log(`AI-Compatibility Rate:       ${aiCompatibleRate}%`);
  console.log("==================================================\n");
}

backfillMatchingCompleteness().catch((err) => {
  console.error("Fatal backfill error:", err);
  process.exit(1);
});
