import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

function fireAndForget(promiseLike: PromiseLike<unknown>): void {
  Promise.resolve(promiseLike).then(() => {}).catch(() => {});
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url || "", key || "");
}

const envKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const GROQ_API_KEYS = envKeys.split(",").map(k => k.trim()).filter(Boolean);

const MODEL = "llama-3.3-70b-versatile";

function normalizeRoleForCache(role: string): string {
  return role.toLowerCase().trim();
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function getCachedCorrection(rawSkill: string): Promise<{ corrected: string; confidence: number } | null> {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("skill_correction_cache")
      .select("corrected, confidence")
      .eq("raw_input", rawSkill.toLowerCase().trim())
      .maybeSingle();
    if (data) {
      fireAndForget(sb.from("skill_correction_cache").update({ hit_count: (data as any).hit_count + 1 }).eq("raw_input", rawSkill.toLowerCase().trim()));
      return { corrected: data.corrected, confidence: data.confidence ?? 0 };
    }
  } catch {
    // Silently fall through to AI
  }
  return null;
}

async function storeCorrectionCache(rawSkill: string, corrected: string, confidence: number): Promise<void> {
  const sb = getSupabase();
  fireAndForget(sb.from("skill_correction_cache").upsert({
    raw_input: rawSkill.toLowerCase().trim(),
    corrected,
    confidence,
  }, { onConflict: "raw_input" }));
}

async function getCachedRoleEquivalence(roleA: string, roleB: string): Promise<{ same_role: boolean; similarity: number; reasoning: string } | null> {
  const a = normalizeRoleForCache(roleA);
  const b = normalizeRoleForCache(roleB);
  const [sortedA, sortedB] = a < b ? [a, b] : [b, a];
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("role_equivalence_cache")
      .select("same_role, similarity, reasoning")
      .eq("role_a", sortedA)
      .eq("role_b", sortedB)
      .maybeSingle();
    if (data) {
      fireAndForget(sb.from("role_equivalence_cache").update({ hit_count: (data as any).hit_count + 1 }).eq("role_a", sortedA).eq("role_b", sortedB));
      return { same_role: data.same_role, similarity: data.similarity ?? 0, reasoning: data.reasoning ?? "" };
    }
  } catch {
    // Silently fall through to AI
  }
  return null;
}

async function storeRoleEquivalenceCache(roleA: string, roleB: string, same_role: boolean, similarity: number, reasoning: string): Promise<void> {
  const a = normalizeRoleForCache(roleA);
  const b = normalizeRoleForCache(roleB);
  const [sortedA, sortedB] = a < b ? [a, b] : [b, a];
  const sb = getSupabase();
  fireAndForget(sb.from("role_equivalence_cache").upsert({
    role_a: sortedA,
    role_b: sortedB,
    same_role,
    similarity,
    reasoning,
  }, { onConflict: "role_a, role_b" }));
}

// ─── Groq helper ──────────────────────────────────────────────────────────────

async function callGroq(systemPrompt: string, userPrompt: string, temperature: number = 0.0): Promise<string | null> {
  if (GROQ_API_KEYS.length === 0) return null;

  const maxRetries = GROQ_API_KEYS.length;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentKey = GROQ_API_KEYS[attempt % GROQ_API_KEYS.length];
    const groq = new Groq({ apiKey: currentKey });
    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        response_format: { type: "json_object" },
      });
      return completion.choices[0]?.message?.content ?? null;
    } catch (error: any) {
      console.warn(`[AICorrection] Groq attempt ${attempt + 1} failed with key ...${currentKey?.slice(-4)}:`, error.message);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  return null;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function correctSkillSpelling(rawSkill: string): Promise<{
  original: string;
  corrected: string;
  confidence: number;
  changed: boolean;
}> {
  const original = rawSkill;

  // Check cache first
  const cached = await getCachedCorrection(rawSkill);
  if (cached) {
    const changed = cached.corrected.toLowerCase().trim() !== rawSkill.toLowerCase().trim();
    return { original, corrected: cached.corrected, confidence: cached.confidence, changed };
  }

  const SYSTEM_PROMPT = "You are a skills taxonomy corrector for a Philippine job matching system. Correct misspelled or abbreviated skill names to their proper standard form. Always respond in valid JSON only. Never add explanation outside the JSON.";
  const USER_PROMPT = `Correct this skill name to its proper standard form: '${rawSkill}'. Respond ONLY with: { corrected: string, confidence: number, reasoning: string }`;

  try {
    const content = await callGroq(SYSTEM_PROMPT, USER_PROMPT);
    if (!content) {
      return { original, corrected: original, confidence: 0, changed: false };
    }

    const parsed = JSON.parse(content) as { corrected?: string; confidence?: number; reasoning?: string };
    const corrected = typeof parsed.corrected === "string" ? parsed.corrected.trim() : original;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

    const changed = confidence >= 0.70 && corrected.toLowerCase().trim() !== original.toLowerCase().trim();

    // Cache result (fire-and-forget)
    storeCorrectionCache(rawSkill, corrected, confidence);

    if (!changed) {
      return { original, corrected: original, confidence: 0, changed: false };
    }

    return { original, corrected, confidence, changed: true };
  } catch {
    return { original, corrected: original, confidence: 0, changed: false };
  }
}

export async function checkRoleEquivalence(roleA: string, roleB: string): Promise<{
  same_role: boolean;
  similarity: number;
  reasoning: string;
}> {
  // Check cache first
  const cached = await getCachedRoleEquivalence(roleA, roleB);
  if (cached) return cached;

  const SYSTEM_PROMPT = "You are a job role classifier for a Philippine job matching system. Determine if two job titles refer to the same or equivalent role. Always respond in valid JSON only.";
  const USER_PROMPT = `Are these the same or equivalent job role? Title A: '${roleA}' | Title B: '${roleB}'. Respond ONLY with: { same_role: boolean, similarity: number, reasoning: string }`;

  try {
    const content = await callGroq(SYSTEM_PROMPT, USER_PROMPT);
    if (!content) {
      return { same_role: false, similarity: 0, reasoning: "error" };
    }

    const parsed = JSON.parse(content) as { same_role?: boolean; similarity?: number; reasoning?: string };
    const result = {
      same_role: parsed.same_role === true,
      similarity: typeof parsed.similarity === "number" ? parsed.similarity : 0,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };

    // Cache result (fire-and-forget)
    storeRoleEquivalenceCache(roleA, roleB, result.same_role, result.similarity, result.reasoning);

    return result;
  } catch {
    return { same_role: false, similarity: 0, reasoning: "error" };
  }
}
