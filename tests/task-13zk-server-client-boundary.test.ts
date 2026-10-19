// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading — placeholders only. Covers Task 13Z-K:
// A. RUNTIME checks of app/lib/supabase.ts module initialisation (fresh CJS load
//    per case) with placeholder credentials and a fetch stub that fails on use.
// B. STATIC SOURCE CHECKS of the server-only guard, the absence of an anon
//    fallback, direct client imports, and the repaired J1 assertion.
//
// Runner note: run with `tsx --tsconfig tsconfig.standalone.json`, whose
// "paths" maps "server-only" to app/lib/server-only-stub.ts (the production
// tsconfig.json does not), so importing supabase.ts here does not throw. The guard is therefore verified statically, plus a direct
// check of the installed package's own behaviour (section C). No Next.js build
// was performed; build-time enforcement is not verified by this file.

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const MODULE = path.join(repoRoot, "app/lib/supabase.ts");

const URL_PLACEHOLDER = "https://placeholder.invalid";
const ANON_PLACEHOLDER = "anon-placeholder-7f3a9c";
const SERVICE_PLACEHOLDER = "service-placeholder-b81e42";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

function freshLoad(): any {
  const resolved = require.resolve(MODULE);
  delete require.cache[resolved];
  return require(resolved);
}

describe("Task 13Z-K — Server-client boundary for the shared Supabase module", () => {
  let savedEnv: Record<string, string | undefined>;
  let origFetch: typeof globalThis.fetch;
  let fetchCalls: number;
  let consoleLines: string[];
  let origConsole: Pick<Console, "log" | "info" | "warn" | "error" | "debug">;

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_PLACEHOLDER;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_PLACEHOLDER;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    delete require.cache[require.resolve(MODULE)];
    assert.equal(fetchCalls, 0, "module initialisation must not perform network calls");
  });

  describe("A. RUNTIME — module initialisation with placeholder credentials", () => {
    it("privileged client is built from the service credential only, never the anon key", () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_PLACEHOLDER;
      const mod = freshLoad();
      assert.equal(mod.supabaseAdmin.supabaseKey, SERVICE_PLACEHOLDER);
      assert.notEqual(mod.supabaseAdmin.supabaseKey, ANON_PLACEHOLDER);
      assert.equal(mod.supabase.supabaseKey, ANON_PLACEHOLDER, "anon export contract unchanged");
      assert.equal(mod.STORAGE_BUCKETS.resumes, "resumes");
    });

    for (const [label, value] of [
      ["absent", undefined],
      ["empty", ""],
      ["whitespace-only", "   "],
    ] as const) {
      it(`missing service credential (${label}) fails closed at import with no anon fallback`, () => {
        if (value === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        else process.env.SUPABASE_SERVICE_ROLE_KEY = value;
        let caught: unknown;
        assert.throws(() => freshLoad(), (err: unknown) => ((caught = err), true));
        const msg = String((caught as Error).message);
        assert.match(msg, /SERVICE_ROLE_KEY/);
        assert.ok(!msg.includes(ANON_PLACEHOLDER), "error must not contain the anon key value");
        assert.ok(!msg.includes(URL_PLACEHOLDER), "error must not contain the project URL");
        assert.deepEqual(consoleLines, [], "nothing may be logged on failure");
      });
    }

    it("service credential equal to the anon key is rejected without echoing the value", () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = ANON_PLACEHOLDER;
      let caught: unknown;
      assert.throws(() => freshLoad(), (err: unknown) => ((caught = err), true));
      const msg = String((caught as Error).message);
      assert.match(msg, /SERVICE_ROLE_KEY/);
      assert.ok(!msg.includes(ANON_PLACEHOLDER));
      assert.deepEqual(consoleLines, []);
    });

    it("existing URL/anon validation still fails closed", () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_PLACEHOLDER;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      assert.throws(() => freshLoad(), /URL and ANON_KEY/);
    });
  });

  describe("B. STATIC SOURCE CHECKS (source text only)", () => {
    const src = () => readFileSync(MODULE, "utf8");

    it("static: server-only guard is the first statement of the shared module", () => {
      const firstStatement = src()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("//"));
      assert.equal(firstStatement, 'import "server-only";');
    });

    it("static: privileged client has no anon-key fallback expression", () => {
      const s = src();
      assert.ok(!/supabaseServiceRoleKey\s*(\|\||\?\?)/.test(s), "no || / ?? fallback on the service key");
      assert.ok(!/SUPABASE_SERVICE_ROLE_KEY\s*(\|\||\?\?)/.test(s), "no fallback at env read");
      assert.match(s, /export const supabaseAdmin = createClient\(supabaseUrl, supabaseServiceRoleKey\);/);
    });

    it("static (one level only): no 'use client' module or middleware imports the shared module directly", () => {
      const shared = /from\s+["'](@\/lib\/supabase|\.\.?\/(?:[^"']*\/)?lib\/supabase|\.\/supabase)["']/;
      const offenders: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          if (name === "node_modules" || name === ".next") continue;
          const p = path.join(dir, name);
          if (statSync(p).isDirectory()) walk(p);
          else if (/\.(tsx?|jsx?)$/.test(name)) {
            const text = readFileSync(p, "utf8");
            if (/^\s*["']use client["']/.test(text) && shared.test(text)) offenders.push(path.relative(repoRoot, p));
          }
        }
      };
      walk(path.join(repoRoot, "app"));
      assert.deepEqual(offenders, []);
      assert.ok(!shared.test(readFileSync(path.join(repoRoot, "middleware.ts"), "utf8")), "middleware must not import it");
    });

    it("static: repaired J1 assertion requires zero browser queries; stale referral_slips expectation is gone", () => {
      const j1 = readFileSync(path.join(repoRoot, "tests/task-13zj-referral-applicant-lookup.test.ts"), "utf8");
      assert.ok(j1.includes("page makes zero direct browser database queries"));
      assert.ok(j1.includes("assert.deepEqual(tables, []"));
      assert.ok(!j1.includes('assert.deepEqual(tables, ["referral_slips"])'));
      const page = readFileSync(path.join(repoRoot, "app/admin/referrals/page.tsx"), "utf8");
      assert.equal(Array.from(page.matchAll(/\.from\(\s*["'`][A-Za-z0-9_.]+["'`]\s*\)/g)).length, 0);
    });

    it("static: production tsconfig does not map server-only; only the standalone config maps it to the stub", () => {
      const stubMapping = /"server-only"\s*:\s*\[\s*"\.\/app\/lib\/server-only-stub\.ts"\s*\]/;
      const production = readFileSync(path.join(repoRoot, "tsconfig.json"), "utf8");
      assert.ok(!/"server-only"/.test(production), "tsconfig.json (used by Next) must not alias server-only");
      const standalone = readFileSync(path.join(repoRoot, "tsconfig.standalone.json"), "utf8");
      assert.match(standalone, stubMapping);
      assert.match(standalone, /"extends"\s*:\s*"\.\/tsconfig\.json"/);
    });
  });

  describe("C. Installed server-only package behaviour (direct file load, bypassing tsconfig paths)", () => {
    function findPackageDir(): string | null {
      let dir = repoRoot;
      for (;;) {
        const candidate = path.join(dir, "node_modules", "server-only");
        if (existsSync(path.join(candidate, "package.json"))) return candidate;
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
      }
    }

    it("default entry throws outside a react-server environment; react-server entry is empty", () => {
      const pkgDir = findPackageDir();
      assert.ok(pkgDir, "server-only must be resolvable from the existing installation");
      const pkg = JSON.parse(readFileSync(path.join(pkgDir!, "package.json"), "utf8"));
      assert.equal(pkg.exports["."].default, "./index.js");
      assert.equal(pkg.exports["."]["react-server"], "./empty.js");
      assert.throws(() => require(path.join(pkgDir!, "index.js")), /Server Component/);
      assert.doesNotThrow(() => require(path.join(pkgDir!, "empty.js")));
    });
  });
});
