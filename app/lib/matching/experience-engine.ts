/**
 * experience-engine.ts
 * Advanced Experience Intelligence and Seniority Inference
 */

import { embeddingService } from './embedding-service';

export interface ExperienceMatchResult {
  score: number;
  seniority: 'entry' | 'mid' | 'senior' | 'executive';
  transferability: number;
}

export class ExperienceEngine {
  /**
   * Detects seniority level from position title and text.
   */
  public detectSeniority(title: string, responsibilities: string): 'entry' | 'mid' | 'senior' | 'executive' {
    const text = (title + ' ' + responsibilities).toLowerCase();
    
    if (text.match(/\b(executive|vp|ceo|cto|director|head of)\b/)) return 'executive';
    if (text.match(/\b(senior|lead|architect|manager|principal)\b/)) return 'senior';
    if (text.match(/\b(junior|intern|trainee|associate)\b/)) return 'entry';
    
    return 'mid';
  }

  /**
   * Computes semantic match score between job requirements and seeker experience.
   */
  public async computeExperienceMatch(jobDesc: string, experiences: any[]): Promise<ExperienceMatchResult> {
    const jobVector = await embeddingService.generateEmbedding(jobDesc);
    
    let maxSimilarity = 0;
    let totalTransferability = 0;
    let highestSeniority: 'entry' | 'mid' | 'senior' | 'executive' = 'entry';

    for (const exp of experiences) {
      const expText = `${exp.position_title} ${exp.responsibilities}`;
      const expVector = await embeddingService.generateEmbedding(expText);
      
      const similarity = embeddingService.cosineSimilarity(jobVector, expVector);
      maxSimilarity = Math.max(maxSimilarity, similarity);
      
      const seniority = this.detectSeniority(exp.position_title || '', exp.responsibilities || '');
      if (this.seniorityToValue(seniority) > this.seniorityToValue(highestSeniority)) {
        highestSeniority = seniority;
      }

      // Transferability is high if semantic similarity is high even if titles differ
      totalTransferability += similarity;
    }

    const avgTransferability = experiences.length > 0 ? totalTransferability / experiences.length : 0;

    return {
      score: maxSimilarity,
      seniority: highestSeniority,
      transferability: avgTransferability
    };
  }

  private seniorityToValue(level: string): number {
    const map: Record<string, number> = { entry: 0, mid: 1, senior: 2, executive: 3 };
    return map[level] || 0;
  }
}

export const experienceEngine = new ExperienceEngine();
