import { DataFetcher } from "./DataFetcher";
import { computeUtilityScore } from "../scoring-engine";
import { rankingCacheEngine } from "../ranking-cache-engine";
import { featureStore } from "../feature-store";
import { latencyBudgetEngine } from "../latency-budget-engine";
import { observabilityEngine } from "../observability-engine";
import { featureFreshnessEngine } from "../feature-freshness-engine";
import { failsafeEngine } from "../failsafe-engine";
import { supabaseAdmin } from "@/lib/supabase";
import { deidentifyJobseeker, RawJobseeker } from "../deidentify";
import { RankingResult } from "../persistence-engine";
import { ensureSynonymsLoaded } from "../skill-synonym-service";
import { buildEmbeddingsMapForSkills } from "../embedding-cache-service";
import { vacancyFromJob } from "../vacancy-from-job";

export class HybridEngine {
  /**
   * ENTERPRISE-GRADE AI RANKING INFRASTRUCTURE
   * High-Performance, Observable, and Fault-Tolerant.
   */
  static async match(jobId: string, bypassCache: boolean = false): Promise<RankingResult[]> {
    const startTime = Date.now();

    try {
      return await latencyBudgetEngine.executeWithSLA(
        jobId,
        async () => {
          // 1. Check Result Cache
          if (!bypassCache) {
            const cached = await rankingCacheEngine.getCachedResults(jobId);
            if (cached) {
              this.logMetrics(jobId, startTime, true, false);
              return cached;
            }
          }

          // 2. Fetch Job Metadata (VacancyPayload)
          console.log(`[HybridEngine] Fetching job ${jobId}...`);
          const { data: job, error: jobError } = await supabaseAdmin
            .from('jobs')
            .select('*, employers(city, province, industry)')
            .eq('id', jobId)
            .single();

          if (jobError || !job) {
            console.error(`[HybridEngine] Job fetch failed:`, jobError);
            throw new Error("Job not found");
          }

          // Job-relevant factors only, from the live jobs columns (shared with
          // single-pair matching in agent.ts).
          const vacancyPayload = vacancyFromJob(job);

          // 3. Retrieval: Combine Vector and SQL results
          console.log(`[HybridEngine] Retrieving candidates...`);
          const [vectorCandidates, sqlCandidates] = await Promise.all([
            DataFetcher.fetchRawVector(jobId, 100),
            DataFetcher.fetchRawSQL(jobId, 100)
          ]);

          const candidateMap = new Map<string, number>();
          vectorCandidates.forEach(c => candidateMap.set(c.id, c.score));
          sqlCandidates.forEach(c => {
            if (!candidateMap.has(c.id)) candidateMap.set(c.id, c.score);
          });
          
          // Pilot rule: only active, consented jobseekers who are looking for work.
          const candidateIds = await DataFetcher.filterEligible(Array.from(candidateMap.keys()));
          console.log(`[HybridEngine] Found ${candidateIds.length} candidates in retrieval pass.`);
          if (candidateIds.length === 0) return [];

          // 4. Fetch Full Jobseeker Data
          console.log(`[HybridEngine] Fetching ${candidateIds.length} profiles...`);
          const { data: rawSeekers, error: seekersError } = await supabaseAdmin
            .from('jobseekers')
            .select(`
              *,
              jobseeker_experience (*),
              jobseeker_education (*),
              jobseeker_trainings (*),
              jobseeker_licenses (*),
              jobseeker_languages (*)
            `) // Removed other_skills (*) join since it is a JSONB column, not a table
            .in('id', candidateIds);
          
          if (seekersError) {
            console.error(`[HybridEngine] Profiles fetch failed:`, seekersError);
            throw seekersError;
          }

          if (!rawSeekers || rawSeekers.length === 0) {
            console.warn(`[HybridEngine] No profile data found for candidates.`);
            return [];
          }

          // 5. Deep Semantic Scoring Pass
          console.log(`[HybridEngine] Scoring ${rawSeekers.length} profiles...`);
          
          await ensureSynonymsLoaded();
          const allSkillsSet = new Set<string>();
          vacancyPayload.requiredSkills.forEach(s => allSkillsSet.add(s.name));
          rawSeekers.forEach(raw => {
            if (raw.top_skills && Array.isArray(raw.top_skills)) {
              raw.top_skills.forEach((s: any) => { if (typeof s === "string") allSkillsSet.add(s); });
            }
            if (raw.other_skills && Array.isArray(raw.other_skills)) {
              raw.other_skills.forEach((s: any) => {
                const name = typeof s === "string" ? s : s?.name || s?.skill;
                // "Others" is the profile form's placeholder; its text is in other_skills_others.
                if (typeof name === "string" && name.trim() && name.trim() !== "Others") allSkillsSet.add(name.trim());
              });
            }
            if (typeof raw.other_skills_others === "string") {
              raw.other_skills_others.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => allSkillsSet.add(s));
            }
          });

          const skillEmbeddingsMap = await buildEmbeddingsMapForSkills(Array.from(allSkillsSet));

          const rawResults = await Promise.all(rawSeekers.map(async (raw) => {
            try {
              const deidentified = deidentifyJobseeker(raw as RawJobseeker);
              const scoreResult = await computeUtilityScore(deidentified, vacancyPayload, undefined, { skill_embeddings_map: skillEmbeddingsMap }, true);
              

              return {
                id: raw.id,
                utility_score: scoreResult.final_score,
                scoring_result: scoreResult
              };
            } catch (err) {
              // Profile id only: names and other personal data stay out of server logs.
              console.error(`[HybridEngine] Scoring failed for profile ${raw.id}:`, err);
              return { id: raw.id, utility_score: 0 };
            }
          }));
          const results: RankingResult[] = rawResults.sort((a, b) => b.utility_score - a.utility_score);

          console.log(`[HybridEngine] Scoring complete: ${results.length} candidates, top score ${results[0]?.utility_score?.toFixed(1)}`);
          this.logMetrics(jobId, startTime, false, false);
          return results;
        },
        async () => {
          console.warn(`[HybridEngine] SLA Timeout/Fallback Triggered for ${jobId}`);
          const res = await failsafeEngine.getSafeRankingResponse(jobId);
          this.logMetrics(jobId, startTime, false, true);
          return res;
        }
      );
    } catch (error) {
      console.error(`[HybridEngine] Critical failure in match():`, error);
      const res = await failsafeEngine.getSafeRankingResponse(jobId, error);
      this.logMetrics(jobId, startTime, false, true);
      return res;
    }
  }

  private static logMetrics(jobId: string, start: number, cacheHit: boolean, fallback: boolean, staleness: number = 0) {
    observabilityEngine.trackRankingMetrics({
      job_id: jobId,
      duration_ms: Date.now() - start,
      cache_hit: cacheHit,
      fallback_triggered: fallback,
      feature_staleness: staleness
    }).catch(e => console.error('[Observability] Silent failure in metrics logging', e));
  }

  private static triggerOfflinePipeline(jobId: string) {
    // Pipeline triggered asynchronously
  }
}
