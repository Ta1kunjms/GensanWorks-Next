/**
 * reranker.ts
 * Production-grade LLM-based Cross-Encoder Reranker
 * Upgraded with Stability Layer and Error Handling
 */

import Groq from 'groq-sdk';

export interface RerankedCandidate {
  candidateId: string;
  score: number;
  reasoning: string[];
  skill_alignment: string[];
}

export class Reranker {
  private groq: Groq;
  private apiKeys: string[];

  constructor() {
    const keys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
    this.apiKeys = keys.split(',').map(k => k.trim()).filter(Boolean);
    this.groq = new Groq({ apiKey: this.apiKeys[0] || '' });
  }

  /**
   * Reranks candidates with strict stability and retry mechanisms.
   */
  public async rerankCandidates(job: any, candidates: any[]): Promise<RerankedCandidate[]> {
    if (this.apiKeys.length === 0) return this.fallbackRerank(candidates);

    const pool = candidates.slice(0, 20);
    const batchSize = 5;
    const results: RerankedCandidate[] = [];

    for (let i = 0; i < pool.length; i += batchSize) {
      const batch = pool.slice(i, i + batchSize);
      let attempts = 0;
      let success = false;

      while (attempts < 2 && !success) {
        try {
          const batchResults = await this.processBatch(job, batch);
          if (batchResults.length > 0) {
            results.push(...batchResults);
            success = true;
          }
        } catch (error) {
          attempts++;
          console.warn(`Rerank attempt ${attempts} failed for batch starting at ${i}`);
        }
      }

      if (!success) {
        results.push(...this.fallbackRerank(batch));
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private async processBatch(job: any, batch: any[]): Promise<RerankedCandidate[]> {
    const prompt = this.buildPrompt(job, batch);

    const completion = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0, // Strict deterministic output
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    if (!Array.isArray(parsed.candidates)) {
      throw new Error('Invalid LLM output schema');
    }

    return parsed.candidates.map((c: any) => ({
      candidateId: c.candidateId,
      score: typeof c.score === 'number' ? c.score : 0.5,
      reasoning: Array.isArray(c.reasoning) ? c.reasoning : [],
      skill_alignment: Array.isArray(c.skill_alignment) ? c.skill_alignment : []
    }));
  }

  private fallbackRerank(candidates: any[]): RerankedCandidate[] {
    return candidates.map(c => ({
      candidateId: c.id,
      score: (c.utility_score || 0) / 100,
      reasoning: ['Ranked via semantic score (LLM Fallback)'],
      skill_alignment: []
    }));
  }

  private buildPrompt(job: any, candidates: any[]): string {
    return `
      Return a JSON object with schema: {"candidates": [{"candidateId": string, "score": number, "reasoning": string[], "skill_alignment": string[]}]}
      
      Rerank these candidates for: ${job.position_title}
      Requirements: ${job.description.substring(0, 500)}
      
      CANDIDATES:
      ${candidates.map(c => `ID: ${c.id} | Skills: ${JSON.stringify(c.seeker.skills)}`).join('\n')}
    `;
  }
}

export const reranker = new Reranker();
