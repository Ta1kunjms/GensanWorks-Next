/**
 * embedding-cache-service.ts
 * 
 * Option 3: Self-Growing AI Embedding Cache
 * 
 * When a skill term has no pre-computed vector in the existing skill_embeddings_map,
 * this service generates it on-demand via OpenAI text-embedding-3-small,
 * then caches it permanently in Supabase's skill_embeddings_cache table.
 * 
 * On future lookups, the cached vector is returned instantly — no API call needed.
 * Over time the DB becomes comprehensive, covering misspellings, abbreviations,
 * and regional skill variants encountered across all candidates.
 */

import { supabaseAdmin } from "@/lib/supabase";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = "text-embedding-3-small";

// In-memory cache to avoid redundant DB lookups within a single request
const sessionCache = new Map<string, number[]>();

/**
 * Fetches an embedding vector for a skill term.
 * 
 * Priority:
 *   1. In-memory session cache (fastest)
 *   2. Supabase skill_embeddings_cache (DB-persisted from previous runs)
 *   3. OpenAI API call → automatically cached in DB for future runs
 *   4. Returns null if all sources fail (Jaro-Winkler fallback will handle it)
 */
export async function getOrGenerateEmbedding(skill: string): Promise<number[] | null> {
  const term = skill.toLowerCase().trim();
  if (!term) return null;

  // 1. Session cache
  if (sessionCache.has(term)) return sessionCache.get(term)!;

  // 2. Supabase persistent cache
  try {
    const { data } = await supabaseAdmin
      .from("skill_embeddings_cache")
      .select("vector")
      .eq("skill_term", term)
      .maybeSingle();

    if (data?.vector) {
      const vec = data.vector as number[];
      sessionCache.set(term, vec);
      return vec;
    }
  } catch (err) {
    console.warn(`[EmbeddingCache] DB lookup failed for "${term}":`, err);
  }

  // 3. OpenAI API call
  if (!OPENAI_API_KEY) {
    console.warn(`[EmbeddingCache] No OPENAI_API_KEY — skipping embedding for "${term}"`);
    return null;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: term, model: EMBED_MODEL }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errCode = err?.error?.code;
      // Silently skip quota/billing errors — Jaro-Winkler fallback handles these
      if (errCode === "insufficient_quota" || errCode === "billing_hard_limit_reached") {
        return null;
      }
      console.warn(`[EmbeddingCache] OpenAI API error for "${term}":`, err);
      return null;
    }

    const json = await response.json();
    const vector: number[] = json?.data?.[0]?.embedding;
    if (!vector?.length) return null;

    // Cache in-memory
    sessionCache.set(term, vector);

    // 4. Persist to Supabase asynchronously (fire-and-forget — don't block matching)
    supabaseAdmin.from("skill_embeddings_cache").upsert({
      skill_term: term,
      vector,
      model: EMBED_MODEL,
    }, { onConflict: "skill_term" }).then(({ error }) => {
      if (error) console.warn(`[EmbeddingCache] Persist failed for "${term}":`, error.message);
      else console.log(`[EmbeddingCache] Cached new embedding for "${term}"`);
    });

    return vector;
  } catch (err) {
    console.warn(`[EmbeddingCache] Exception generating embedding for "${term}":`, err);
    return null;
  }
}

/**
 * Batch pre-warm — fetches all terms from DB in one call.
 * Use this to pre-load embeddings for all vacancy required skills
 * at the start of a matching run, minimizing per-skill DB round trips.
 */
export async function preloadEmbeddings(terms: string[]): Promise<Map<string, number[]>> {
  const normalizedTerms = terms.map(t => t.toLowerCase().trim()).filter(Boolean);
  const result = new Map<string, number[]>();

  if (normalizedTerms.length === 0) return result;

  try {
    const { data } = await supabaseAdmin
      .from("skill_embeddings_cache")
      .select("skill_term, vector")
      .in("skill_term", normalizedTerms);

    for (const row of data ?? []) {
      const vec = row.vector as number[];
      result.set(row.skill_term, vec);
      sessionCache.set(row.skill_term, vec);
    }
  } catch (err) {
    console.warn("[EmbeddingCache] Batch preload failed:", err);
  }

  return result;
}

// Fix typo in constant name used above
const OPENAI_API_URL = OPENAI_EMBED_URL;

import { resolveSkillSync } from "./skill-synonym-service";

/**
 * Builds a Record<string, number[]> of embeddings for a given set of raw skill terms.
 * Resolves synonyms and generates vectors on-demand (leveraging both session & Supabase caches).
 */
export async function buildEmbeddingsMapForSkills(skills: string[]): Promise<Record<string, number[]>> {
  const map: Record<string, number[]> = {};
  const uniqueTerms = Array.from(new Set(skills.map(s => s.toLowerCase().trim()).filter(Boolean)));
  if (uniqueTerms.length === 0) return map;

  // First preload all already-cached embeddings in a single batch
  const preloaded = await preloadEmbeddings(uniqueTerms);

  // For any remaining, resolve synonyms and fetch/generate embeddings in parallel
  const promises = uniqueTerms.map(async (term) => {
    // Check if we already have it from preload
    if (preloaded.has(term)) {
      map[term] = preloaded.get(term)!;
      return;
    }

    const resolved = resolveSkillSync(term);
    if (preloaded.has(resolved)) {
      map[term] = preloaded.get(resolved)!;
      map[resolved] = preloaded.get(resolved)!;
      return;
    }

    // Try generating or fetching on-demand
    const vector = await getOrGenerateEmbedding(resolved);
    if (vector) {
      map[term] = vector;
      map[resolved] = vector;
    }
  });

  await Promise.all(promises);
  return map;
}

