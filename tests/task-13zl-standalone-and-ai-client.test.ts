// Synthetic, fully offline test. No live Supabase or Groq calls, no database
// access, no network access, no .env loading — placeholders only. Covers Task 13Z-M:
// A. STATIC SOURCE CHECKS of the production/standalone tsconfig separation and of
//    app/lib/matching/ai-correction-service.ts (source text only).
// B. RUNTIME checks: fresh CJS loads of the AI correction service with placeholder
//    credentials, an in-memory fake on supabaseAdmin.from, and a fetch stub that
//    fails on use.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const SUPABASE_MODULE = path.join(repoRoot, "app/lib/supabase.ts");
const AI_MODULE = path.join(repoRoot, "app/lib/matching/ai-correction-service.ts");

const URL_PLACEHOLDER = "https://placeholder.invalid";
const ANON_PLACEHOLDER = "anon-placeholder-4d1c07";
const SERVICE_PLACEHOLDER = "service-placeholder-e95a3b";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NODE_ENV",
  "GROQ_API_KEY",
  "GROQ_API_KEYS",
] as const;

/** Parse a tsconfig file whose only comments are whole-line // comments. */
function readJsonc(rel: string): any {
  const text = readFileSync(path.join(repoRoot, rel), "utf8");
  return JSON.parse(text.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n"));
}

function clearModules() {
  for (const m of [AI_MODULE, SUPABASE_MODULE]) delete require.cache[require.resolve(m)];
}

describe("Task 13Z-M — Standalone configuration and guarded AI correction client", () => {
  describe("A. STATIC SOURCE CHECKS (source text only)", () => {
    it("static: standalone paths preserve every base alias with identical targets", () => {
      const base = readJsonc("tsconfig.json");
      const standalone = readJsonc("tsconfig.standalone.json");
      assert.equal(standalone.extends, "./tsconfig.json");
      const basePaths = base.compilerOptions.paths as Record<string, string[]>;
      const standalonePaths = standalone.compilerOptions.paths as Record<string, string[]>;
      assert.ok(Object.keys(basePaths).length > 0);
      for (const [alias, targets] of Object.entries(basePaths)) {
        assert.deepEqual(standalonePaths[alias], targets, `alias ${alias} must be preserved`);
      }
      const extra = Object.keys(standalonePaths).filter((k) => !(k in basePaths));
      assert.deepEqual(extra, ["server-only"], "only the server-only stub mapping is added");
      assert.deepEqual(standalonePaths["server-only"], ["./app/lib/server-only-stub.ts"]);
      assert.equal(standalone.compilerOptions.baseUrl, base.compilerOptions.baseUrl);
    });

    it("static: production tsconfig has no server-only mapping and Next still points at it", () => {
      const base = readJsonc("tsconfig.json");
      assert.ok(!("server-only" in base.compilerOptions.paths));
      const nextConfig = readFileSync(path.join(repoRoot, "next.config.ts"), "utf8");
      assert.match(nextConfig, /tsconfigPath:\s*"\.\/tsconfig\.json"/);
    });

    it("static: AI correction service reuses the guarded supabaseAdmin with no independent client or anon fallback", () => {
      const src = readFileSync(AI_MODULE, "utf8");
      assert.match(src, /import \{ supabaseAdmin \} from "\.\.\/supabase";/);
      assert.ok(!/@supabase\/supabase-js/.test(src), "no direct supabase-js import");
      assert.ok(!/\bcreateClient\b/.test(src), "no independent client construction");
      assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_URL/.test(src), "no credential env reads");
      assert.match(src, /function getSupabase\(\) \{\s*return supabaseAdmin;\s*\}/);
      assert.match(src, /export async function correctSkillSpelling\(/);
      assert.match(src, /export async function checkRoleEquivalence\(/);
    });

    it("static: no import cycle — the guarded module imports only server-only and supabase-js", () => {
      const src = readFileSync(SUPABASE_MODULE, "utf8");
      const specs = Array.from(src.matchAll(/^import\s+(?:[^"']*\s+from\s+)?["']([^"']+)["']/gm)).map((m) => m[1]);
      assert.deepEqual(specs, ["server-only", "@supabase/supabase-js"]);
    });
  });

  describe("B. RUNTIME — placeholder-configured loads with network blocked", () => {
    let savedEnv: Record<string, string | undefined>;
    let origFetch: typeof globalThis.fetch;
    let fetchCalls: number;
    let consoleLines: string[];
    let origConsole: Pick<Console, "log" | "info" | "warn" | "error" | "debug">;

    beforeEach(() => {
      savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
      process.env.NEXT_PUBLIC_SUPABASE_URL = URL_PLACEHOLDER;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_PLACEHOLDER;
      process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_PLACEHOLDER;
      process.env.NODE_ENV = "test";
      delete process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEYS;
      clearModules();

      fetchCalls = 0;
      origFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        fetchCalls++;
        throw new Error("unexpected network call in offline test");
      }) as typeof globalThis.fetch;

      consoleLines = [];
      origConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
      for (const k of Object.keys(origConsole) as (keyof typeof origConsole)[]) {
        console[k] = (...args: unknown[]) => void consoleLines.push(args.map(String).join(" "));
      }
    });

    afterEach(() => {
      Object.assign(console, origConsole);
      globalThis.fetch = origFetch;
      for (const k of ENV_KEYS) {
        if (savedEnv[k] === undefined) delete process.env[k];
        else process.env[k] = savedEnv[k];
      }
      clearModules();
      assert.equal(fetchCalls, 0, "no network request may be made");
    });

    it("runner: standalone tsconfig is propagated to the test process", () => {
      const configured = process.env.TSX_TSCONFIG_PATH ?? "";
      assert.ok(configured.endsWith("tsconfig.standalone.json"), `TSX_TSCONFIG_PATH was "${configured}"`);
    });

    it("cache reads and writes go through the shared guarded supabaseAdmin instance", async () => {
      const { supabaseAdmin } = require(SUPABASE_MODULE);
      assert.equal(supabaseAdmin.supabaseKey, SERVICE_PLACEHOLDER);
      const tables: string[] = [];
      const origFrom = supabaseAdmin.from;
      supabaseAdmin.from = (table: string) => {
        tables.push(table);
        const row =
          table === "skill_correction_cache"
            ? { corrected: "React", confidence: 0.95, hit_count: 1 }
            : { same_role: true, similarity: 0.93, reasoning: "synthetic", hit_count: 1 };
        const builder: any = new Proxy(
          {},
          {
            get(_t, prop) {
              if (prop === "maybeSingle") return () => Promise.resolve({ data: row, error: null });
              if (prop === "then") return (onF: any, onR: any) => Promise.resolve({ data: null, error: null }).then(onF, onR);
              return () => builder;
            },
          }
        );
        return builder;
      };
      try {
        const ai = require(AI_MODULE);
        const spelling = await ai.correctSkillSpelling("reactjs");
        assert.deepEqual(spelling, { original: "reactjs", corrected: "React", confidence: 0.95, changed: true });
        const role = await ai.checkRoleEquivalence("Software Engineer", "Software Developer");
        assert.deepEqual(role, { same_role: true, similarity: 0.93, reasoning: "synthetic" });
        await new Promise((r) => setImmediate(r));
        assert.ok(tables.includes("skill_correction_cache"));
        assert.ok(tables.includes("role_equivalence_cache"));
      } finally {
        supabaseAdmin.from = origFrom;
      }
    });

    it("cache miss with no AI key keeps the safe fallback contract and stores nothing", async () => {
      const { supabaseAdmin } = require(SUPABASE_MODULE);
      const ops: string[] = [];
      const origFrom = supabaseAdmin.from;
      supabaseAdmin.from = (table: string) => {
        const builder: any = new Proxy(
          {},
          {
            get(_t, prop) {
              if (prop === "maybeSingle") return () => Promise.resolve({ data: null, error: null });
              if (prop === "then") return undefined;
              return () => (ops.push(`${table}.${String(prop)}`), builder);
            },
          }
        );
        return builder;
      };
      try {
        const ai = require(AI_MODULE);
        assert.deepEqual(await ai.correctSkillSpelling("reactjs"), { original: "reactjs", corrected: "reactjs", confidence: 0, changed: false });
        assert.deepEqual(await ai.checkRoleEquivalence("Software Engineer", "Cook"), { same_role: false, similarity: 0, reasoning: "error" });
        assert.ok(!ops.some((op) => op.endsWith(".upsert")), "no cache write on fallback");
      } finally {
        supabaseAdmin.from = origFrom;
      }
    });

    it("missing privileged configuration fails closed when the AI service is imported", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      let caught: unknown;
      assert.throws(() => require(AI_MODULE), (err: unknown) => ((caught = err), true));
      const msg = String((caught as Error).message);
      assert.match(msg, /SERVICE_ROLE_KEY/);
      assert.ok(!msg.includes(ANON_PLACEHOLDER) && !msg.includes(URL_PLACEHOLDER));
      assert.deepEqual(consoleLines, []);
    });

    it("service key equal to the anon key is rejected for the AI service import", () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = ANON_PLACEHOLDER;
      assert.throws(() => require(AI_MODULE), /SERVICE_ROLE_KEY/);
    });
  });
});
