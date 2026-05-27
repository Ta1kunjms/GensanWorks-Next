/**
 * skill-synonym-service.ts
 * 
 * AI-Powered Skill Synonym Resolver
 * 
 * Loads a synonym map from Supabase (generated once by seed-skill-synonyms.ts)
 * and uses it to resolve skill variants at runtime with zero LLM latency.
 * Falls back to the hardcoded SKILL_SYNONYMS if DB is unavailable.
 */

import { supabaseAdmin } from "@/lib/supabase";

// In-memory cache — loaded once per process lifecycle
let synonymCache: Map<string, string> | null = null;
let lastLoaded = 0;
const CACHE_TTL_MS = 1000 * 60 * 60; // Refresh every 1 hour

/** Hardcoded fallback — used if DB is unavailable */
const FALLBACK_SYNONYMS: Record<string, string> = {
  "ms excel": "microsoft excel",
  "ms word": "microsoft word",
  "ms powerpoint": "microsoft powerpoint",
  "ms office": "microsoft office",
  "excel": "microsoft excel",
  "spreadsheet": "microsoft excel",
  "google sheets": "microsoft excel",
  "js": "javascript",
  "ts": "typescript",
  "node": "node.js",
  "react": "react.js",
  "postgres": "postgresql",
  "psql": "postgresql",
  "mongo": "mongodb",
  "bookkeeper": "bookkeeping",
  "accounting software": "accounting",
  "electrical wiring": "wiring",
  "electrical repair": "electrical troubleshooting",
  "patient assessment": "patient care",
  "nursing care": "nursing",
  "cpr": "first aid",
  "customer relations": "customer service",
  "retail sales": "sales",
};

/**
 * Loads and caches the synonym map from Supabase.
 * Re-fetches every hour to pick up any new AI-generated entries.
 */
async function loadSynonymMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (synonymCache && now - lastLoaded < CACHE_TTL_MS) {
    return synonymCache;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("skill_synonyms")
      .select("alias, canonical")
      .order("confidence", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("[SkillSynonymService] DB load failed or empty, using fallback:", error?.message);
      return buildFallbackMap();
    }

    const map = new Map<string, string>();
    for (const row of data) {
      map.set(row.alias.toLowerCase().trim(), row.canonical.toLowerCase().trim());
    }

    synonymCache = map;
    lastLoaded = now;
    console.log(`[SkillSynonymService] Loaded ${map.size} synonyms from DB`);
    return map;
  } catch (err) {
    console.warn("[SkillSynonymService] Exception loading synonyms:", err);
    return buildFallbackMap();
  }
}

function buildFallbackMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [alias, canonical] of Object.entries(FALLBACK_SYNONYMS)) {
    map.set(alias, canonical);
  }
  synonymCache = map;
  lastLoaded = Date.now();
  return map;
}

/**
 * Resolves a skill string to its canonical form using the AI-generated synonym map.
 * Returns the original skill if no synonym is found.
 */
export async function resolveSkillAsync(skill: string): Promise<string> {
  const map = await loadSynonymMap();
  const lower = skill.toLowerCase().trim();
  return map.get(lower) ?? lower;
}

/**
 * Synchronous version using the in-memory cache.
 * Must call ensureSynonymsLoaded() before using this.
 */
export function resolveSkillSync(skill: string): string {
  const lower = skill.toLowerCase().trim();
  if (!synonymCache) return FALLBACK_SYNONYMS[lower] ?? lower;
  return synonymCache.get(lower) ?? lower;
}

/**
 * Pre-warms the synonym cache. Call this once at the start of the
 * matching pipeline (e.g., in agent.ts before computeUtilityScore).
 */
export async function ensureSynonymsLoaded(): Promise<void> {
  await loadSynonymMap();
}

/**
 * Inserts a new synonym pair (discovered at runtime) into the DB
 * so future runs benefit from it.
 */
export async function learnSynonym(alias: string, canonical: string, confidence: number = 0.9): Promise<void> {
  const normalizedAlias = alias.toLowerCase().trim();
  const normalizedCanonical = canonical.toLowerCase().trim();
  if (normalizedAlias === normalizedCanonical) return;

  try {
    await supabaseAdmin.from("skill_synonyms").upsert({
      alias: normalizedAlias,
      canonical: normalizedCanonical,
      source: "runtime",
      confidence,
    }, { onConflict: "alias" });

    // Immediately update cache
    if (synonymCache) synonymCache.set(normalizedAlias, normalizedCanonical);
  } catch (err) {
    console.warn("[SkillSynonymService] Could not persist learned synonym:", err);
  }
}
