// Offline static checks for supabase/migrations/20261021120000_lock_down_ai_tables_and_functions.sql.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const FILE = "supabase/migrations/20261021120000_lock_down_ai_tables_and_functions.sql";
const raw = readFileSync(path.join(process.cwd(), FILE), "utf8").replace(/\r\n/g, "\n");
const sql = raw.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
const TABLES = ["job_match_scores", "ai_matching_logs", "dead_letter_queue", "skill_synonyms", "skill_embeddings_cache"];

describe("AI tables lockdown migration", () => {
  it("drops every permissive USING(true) policy and revokes client grants", () => {
    for (const p of ["service_match_scores", "service_ai_logs", "service_dlq", "service_skill_synonyms", "service_embeddings"]) {
      assert.ok(sql.includes(`DROP POLICY IF EXISTS ${p} `), p);
    }
    const revoke = sql.slice(sql.indexOf("REVOKE ALL ON TABLE"), sql.indexOf("FROM PUBLIC, anon, authenticated;"));
    for (const t of TABLES) assert.ok(revoke.includes(`public.${t}`), t);
  });

  it("keeps RLS on and never touches service_role or data", () => {
    for (const t of TABLES) assert.ok(sql.includes(`ALTER TABLE public.${t}`) && sql.includes("ENABLE ROW LEVEL SECURITY"), t);
    assert.ok(!/service_role/.test(sql));
    assert.ok(!/\b(DELETE FROM|TRUNCATE|DROP TABLE|UPDATE public\.)\b/i.test(sql));
    assert.ok(!/CREATE POLICY/i.test(sql), "no new client policies");
  });

  it("hardens the view and SECURITY DEFINER functions, in one transaction, with a documented rollback", () => {
    assert.ok(sql.includes("ALTER VIEW public.employer_feedback_summary SET (security_invoker = on);"));
    assert.ok(sql.includes("REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;"));
    assert.ok(sql.includes("REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;"));
    assert.match(sql, /^BEGIN;[\s\S]*COMMIT;\s*$/m);
    assert.ok(raw.includes("-- ROLLBACK"));
    assert.ok(raw.includes("Never applied by an agent"));
  });
});
