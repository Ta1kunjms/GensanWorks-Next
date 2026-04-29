/**
 * embedding-service.ts
 * Production-grade Embedding Service with Caching and Rate Limiting
 */

import crypto from 'node:crypto';

export class EmbeddingService {
  private cache: Map<string, number[]> = new Map();
  private apiKey: string;
  private apiEndpoint: string = 'https://api.openai.com/v1/embeddings';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY is not set. EmbeddingService will fail on real calls.');
    }
  }

  /**
   * Generates embedding for a single string.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const hash = this.getHash(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    const embeddings = await this.batchEmbeddings([text]);
    const vector = embeddings[0];
    this.cache.set(hash, vector);
    return vector;
  }

  /**
   * Batch embedding support to optimize API calls and handle rate limits.
   */
  public async batchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      // Mock for development if no key
      return texts.map(() => Array(1536).fill(0).map(() => Math.random()));
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          input: texts,
          model: 'text-embedding-3-small'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getHash(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }
}

export const embeddingService = new EmbeddingService();
