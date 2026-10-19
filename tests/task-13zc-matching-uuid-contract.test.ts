import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Placeholder config only so the Supabase client module can load; no request is ever made.
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";

// Network / fetch guard: ensure no test makes external network or database calls.
(globalThis as any).fetch = () => {
  throw new Error("Network/database fetch invoked in offline contract test");
};

const UUID_A = "3f2b8c1e-9d4a-4e6b-8a1c-2b3d4e5f6a7b";
const UUID_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const NSRP_A = "NSRP-2026-000123";

async function loadModules() {
  const { supabaseAdmin } = await import("@/lib/supabase");
  const { DataFetcher } = await import("@/lib/matching/engine/DataFetcher");
  const { RankingService } = await import("@/lib/matching/services/RankingService");
  return { supabaseAdmin, DataFetcher, RankingService };
}

function stubRpc(supabaseAdmin: any, rows: unknown[]) {
  const original = supabaseAdmin.rpc;
  supabaseAdmin.rpc = async (fn: string) => {
    assert.equal(fn, "match_jobseekers_to_job");
    return { data: rows, error: null };
  };
  return () => {
    supabaseAdmin.rpc = original;
  };
}

function silenceWarn() {
  const original = console.warn;
  const calls: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };
  return { calls, restore: () => (console.warn = original) };
}

const MIXED_ROWS = [
  { id: UUID_A, nsrp_id: NSRP_A, similarity: 0.9 }, // UUID id with distinct non-UUID nsrp_id
  { id: UUID_B, nsrp_id: null, similarity: 0.8 }, // valid id, null nsrp_id
  { nsrp_id: "NSRP-2026-000999", similarity: 0.7 }, // absent id (old RPC contract shape)
  { id: null, nsrp_id: "NSRP-2026-000998", similarity: 0.6 }, // null id
  { id: "NSRP-2026-000997", nsrp_id: "NSRP-2026-000997", similarity: 0.5 }, // malformed id
  { id: "", nsrp_id: "NSRP-2026-000996", similarity: 0.4 }, // empty id
];

test("Static contract (not SQL execution): draft match_jobseekers_to_job returns id UUID, nsrp_id TEXT, similarity FLOAT", () => {
  const sqlPath = path.resolve(__dirname, "../docs/schema/generated/core-a-canonical-baseline-v1.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const fnMatch = sql.match(/CREATE FUNCTION match_jobseekers_to_job\([\s\S]*?\$\$;/);
  assert.ok(fnMatch, "match_jobseekers_to_job must be defined in the draft baseline");
  const fn = fnMatch[0].replace(/\s+/g, " ");

  assert.ok(
    fn.includes("RETURNS TABLE ( id UUID, nsrp_id TEXT, similarity FLOAT )"),
    "RETURNS TABLE must be (id UUID, nsrp_id TEXT, similarity FLOAT)"
  );
  assert.ok(fn.includes("SELECT js.id, js.nsrp_id, 1 - (js.profile_embedding <=> j.job_embedding) AS similarity"));
  // Parameters, threshold, and limit unchanged
  assert.ok(fn.includes("job_id UUID, match_threshold FLOAT DEFAULT 0.5, match_count INT DEFAULT 20"));
  assert.ok(fn.includes("> match_threshold"));
  assert.ok(fn.includes("ORDER BY similarity DESC LIMIT match_count;"));
});

test("Callers no longer substitute nsrp_id for the UUID identity (source guard)", () => {
  for (const rel of [
    "../app/lib/matching/engine/DataFetcher.ts",
    "../app/lib/matching/services/RankingService.ts",
  ]) {
    const src = fs.readFileSync(path.resolve(__dirname, rel), "utf-8");
    assert.ok(!/\.id\s*\|\|\s*\w+\.nsrp_id/.test(src), `${rel} must not fall back from id to nsrp_id`);
    assert.ok(!/\.nsrp_id\b/.test(src), `${rel} must not read nsrp_id from RPC rows`);
  }
});

test("DataFetcher.fetchRawVector keeps UUID identity and drops rows without a valid id", async () => {
  const { supabaseAdmin, DataFetcher } = await loadModules();
  const restoreRpc = stubRpc(supabaseAdmin, MIXED_ROWS);
  const warn = silenceWarn();
  try {
    const candidates = await DataFetcher.fetchRawVector("job-1", 200);

    assert.deepEqual(candidates, [
      { id: UUID_A, score: 0.9 },
      { id: UUID_B, score: 0.8 },
    ]);
    for (const c of candidates) {
      assert.ok(!c.id.startsWith("NSRP"), "NSRP code must never become a candidate identity");
    }
    assert.equal(warn.calls.length, 1, "skipped rows are reported once (count only)");
    assert.ok(!String(warn.calls[0][0]).includes("NSRP"), "warning must not include identifiers");
  } finally {
    warn.restore();
    restoreRpc();
  }
});

test("RankingService.rankCandidates scores only UUID identities and never passes nsrp_id", async () => {
  const { supabaseAdmin, RankingService } = await loadModules();
  const restoreRpc = stubRpc(supabaseAdmin, MIXED_ROWS);
  const warn = silenceWarn();
  const originalCompute = RankingService.computeHybridScore;
  const seenIds: unknown[] = [];
  (RankingService as any).computeHybridScore = async (_jobId: string, jobseekerId: string, similarity: number) => {
    seenIds.push(jobseekerId);
    return {
      jobseeker_id: jobseekerId,
      final_score: similarity * 100,
      components: { structured: 0, semantic: similarity * 100, behavioral: 50 },
    };
  };
  try {
    const results = await RankingService.rankCandidates("job-1", 50);

    assert.deepEqual(seenIds, [UUID_A, UUID_B]);
    assert.deepEqual(
      results.map((r) => r.jobseeker_id),
      [UUID_A, UUID_B]
    );
    assert.ok(!seenIds.includes(undefined));
    assert.ok(!seenIds.some((id) => typeof id === "string" && id.startsWith("NSRP")));
    assert.equal(warn.calls.length, 1);
  } finally {
    (RankingService as any).computeHybridScore = originalCompute;
    warn.restore();
    restoreRpc();
  }
});

test("Old RPC contract (nsrp_id only) yields no candidates rather than NSRP identities", async () => {
  const { supabaseAdmin, DataFetcher } = await loadModules();
  const restoreRpc = stubRpc(supabaseAdmin, [{ nsrp_id: NSRP_A, similarity: 0.95 }]);
  const warn = silenceWarn();
  try {
    assert.deepEqual(await DataFetcher.fetchRawVector("job-1"), []);
  } finally {
    warn.restore();
    restoreRpc();
  }
});
