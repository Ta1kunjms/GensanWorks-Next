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
            .select('*')
            .eq('id', jobId)
            .single();

          if (jobError || !job) {
            console.error(`[HybridEngine] Job fetch failed:`, jobError);
            throw new Error("Job not found");
          }

          const vacancyPayload = {
            id: job.id,
            title: job.position_title,
            description: job.job_description,
            requiredSkills: (job.required_skills as any[])?.map(s => ({
              name: typeof s === 'string' ? s : s.name,
              importance: s.importance || "important"
            })) || [],
            experienceMin: job.experience_min || 0,
            experienceMax: job.experience_max || 0,
            educationRequired: job.education_level || "No data",
            workSetup: job.work_setup || "any",
            city: job.city_municipality,
            province: job.province,
            expectedSalaryMin: job.salary_min,
            expectedSalaryMax: job.salary_max,
            skill_vector: job.skill_vector
          };

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
          
          const candidateIds = Array.from(candidateMap.keys());
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
          
          if (rawSeekers && rawSeekers.length > 0) {
            console.log("=== DIAGNOSTIC: JOBSEEKER DATA KEYS ===");
            console.log("Jobseeker Sample Keys:", Object.keys(rawSeekers[0]));
            if ((rawSeekers[0] as any).jobseeker_experience?.[0]) {
              console.log("Experience Sample Keys:", Object.keys((rawSeekers[0] as any).jobseeker_experience[0]));
            }
            if ((rawSeekers[0] as any).jobseeker_education?.[0]) {
              console.log("Education Sample Keys:", Object.keys((rawSeekers[0] as any).jobseeker_education[0]));
            }
          }

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
          const results: RankingResult[] = rawSeekers.map(raw => {
            const seekerName = `${(raw as any).first_name} ${(raw as any).last_name}`;
            try {
              const deidentified = deidentifyJobseeker(raw as RawJobseeker);
              const scoreResult = computeUtilityScore(deidentified, vacancyPayload as any);
              
              if (scoreResult.final_score > 50) {
                console.log(`[HybridEngine] Candidate: ${seekerName} | Score: ${scoreResult.final_score.toFixed(1)}`);
              }

              return {
                id: raw.id,
                utility_score: scoreResult.final_score,
                scoring_result: scoreResult
              };
            } catch (err) {
              console.error(`[HybridEngine] Scoring failed for ${seekerName}:`, err);
              return { id: raw.id, utility_score: 0 };
            }
          }).sort((a, b) => b.utility_score - a.utility_score);

          console.log(`[HybridEngine] Scoring complete. Top score: ${results[0]?.utility_score}`);
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
