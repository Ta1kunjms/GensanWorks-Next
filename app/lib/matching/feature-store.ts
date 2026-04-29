/**
 * feature-store.ts
 * High-performance precomputed feature storage for online ranking.
 * In production, this would query a Redis-backed or highly indexed DB table.
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface PrecomputedFeatures {
  id: string;
  skill_vector: number[];
  exp_vector: number[];
  ontology_scores: Record<string, number>;
  calibration_factor: number;
}

export class FeatureStore {
  /**
   * Fetches precomputed features for a batch of candidates.
   * This is designed to be extremely fast (<50ms).
   */
  public async getBatchFeatures(seekerIds: string[]): Promise<Map<string, PrecomputedFeatures>> {
    const { data, error } = await supabaseAdmin
      .from('jobseeker_features')
      .select('*')
      .in('id', seekerIds);

    if (error || !data) return new Map();

    const featureMap = new Map();
    data.forEach(row => {
      featureMap.set(row.id, {
        id: row.id,
        skill_vector: row.skill_vector,
        exp_vector: row.exp_vector,
        ontology_scores: row.ontology_scores || {},
        calibration_factor: row.calibration_factor || 1.0
      });
    });

    return featureMap;
  }

  /**
   * Async update of feature store from offline jobs.
   */
  public async updateFeatures(id: string, updates: Partial<PrecomputedFeatures>) {
    await supabaseAdmin.from('jobseeker_features').upsert({ id, ...updates });
  }
}

export const featureStore = new FeatureStore();
