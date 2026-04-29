/**
 * dataset-builder.ts
 * Generates Training Datasets for Ranking Model Distillation
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface RankingFeatureSet {
  skill_similarity: number;
  ontology_score: number;
  experience_score: number;
  embedding_score: number;
}

export class DatasetBuilder {
  /**
   * Logs a ranking event with its feature set and label for training.
   */
  public async logTrainingInstance(
    jobId: string, 
    candidateId: string, 
    features: RankingFeatureSet, 
    label: number
  ) {
    const { error } = await supabaseAdmin.from('training_ranking_dataset').insert({
      job_id: jobId,
      candidate_id: candidateId,
      skill_similarity: features.skill_similarity,
      ontology_score: features.ontology_score,
      experience_score: features.experience_score,
      embedding_score: features.embedding_score,
      label: label,
      captured_at: new Date().toISOString()
    });

    if (error) console.error('Failed to log training instance:', error);
  }

  /**
   * Exports the dataset for external model training (e.g., XGBoost/LightGBM).
   */
  public async exportDataset(limit: number = 1000) {
    const { data } = await supabaseAdmin
      .from('training_ranking_dataset')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(limit);

    return data;
  }
}

export const datasetBuilder = new DatasetBuilder();
