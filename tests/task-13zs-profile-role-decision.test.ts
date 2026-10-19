// Synthetic, fully offline test. Pure-function checks only — no Supabase client,
// no database, no network, no .env loading. Covers Task 13Z-S:
// A. RUNTIME checks of decideProfileRole / roleFromDecision (app/lib/profile-role.ts).
// B. STATIC SOURCE CHECKS that the module is dependency-free and metadata-free, and
//    that app/lib/auth.ts delegates to it.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ROLE_PROFILE_TABLES,
  decideProfileRole,
  roleFromDecision,
  type ProfileRole,
  type RoleProfileLookup,
} from "@/lib/profile-role";

const repoRoot = path.resolve(__dirname, "..");
const USER_ID = "4c8e2a1d-7b3f-4d9e-8a6c-5f1e0b2d3c4a";

type Spec = Partial<Record<ProfileRole, boolean | null | "error">>;

/** One lookup per table; a present key means a row exists with that is_active value. */
function lookups(spec: Spec): RoleProfileLookup[] {
  return ROLE_PROFILE_TABLES.map(([role]): RoleProfileLookup => {
    const value = spec[role];
    if (value === "error") return { role, row: null, failed: true };
    if (value === undefined) return { role, row: null, failed: false };
    return { role, row: { id: USER_ID, is_active: value }, failed: false };
  });
}

describe("Task 13Z-S — Pure profile-role decision", () => {
  describe("A. RUNTIME — decision table", () => {
    it("zero rows -> none (no default jobseeker)", () => {
      const d = decideProfileRole(lookups({}));
      assert.deepEqual(d, { status: "none" });
      assert.equal(roleFromDecision(d), null);
    });

    for (const role of ["admin", "employer", "jobseeker"] as const) {
      it(`exactly one active ${role} row -> ${role}`, () => {
        const d = decideProfileRole(lookups({ [role]: true }));
        assert.deepEqual(d, { status: "ok", role });
        assert.equal(roleFromDecision(d), role);
      });
    }

    for (const isActive of [false, null] as const) {
      it(`one inactive row (is_active=${isActive}) -> inactive`, () => {
        const d = decideProfileRole(lookups({ employer: isActive }));
        assert.deepEqual(d, { status: "inactive" });
        assert.equal(roleFromDecision(d), null);
      });
    }

    it("two rows (both active) -> conflict", () => {
      assert.deepEqual(decideProfileRole(lookups({ admin: true, jobseeker: true })), { status: "conflict" });
    });

    it("conflicting rows where only one is active -> conflict, not the active one", () => {
      assert.deepEqual(decideProfileRole(lookups({ employer: true, jobseeker: false })), { status: "conflict" });
    });

    it("three rows -> conflict", () => {
      assert.deepEqual(decideProfileRole(lookups({ admin: true, employer: true, jobseeker: true })), { status: "conflict" });
    });

    it("any lookup error -> error, even alongside an active row", () => {
      const d = decideProfileRole(lookups({ admin: true, employer: "error" }));
      assert.deepEqual(d, { status: "error" });
      assert.equal(roleFromDecision(d), null);
    });

    it("incomplete lookup set (a table not checked) -> error", () => {
      const partial = lookups({ jobseeker: true }).filter((l) => l.role !== "admin");
      assert.deepEqual(decideProfileRole(partial), { status: "error" });
    });

    it("duplicate lookups for one table -> error", () => {
      const all = lookups({ jobseeker: true });
      const duplicated = [...all.slice(0, 2), all[1]].filter((l): l is RoleProfileLookup => l !== undefined);
      assert.deepEqual(decideProfileRole(duplicated), { status: "error" });
    });

    it("tables cover admins, employers, jobseekers exactly", () => {
      assert.deepEqual(ROLE_PROFILE_TABLES.map(([role, table]) => [role, table]), [
        ["admin", "admins"],
        ["employer", "employers"],
        ["jobseeker", "jobseekers"],
      ]);
    });
  });

  describe("B. STATIC SOURCE CHECKS (source text only)", () => {
    // Code only: whole-line // comments and /** */ doc lines are stripped (the header
    // comment intentionally mentions user_metadata to document that it is never read).
    const moduleSrc = () =>
      readFileSync(path.join(repoRoot, "app/lib/profile-role.ts"), "utf8")
        .split(/\r?\n/)
        .filter((l) => !/^\s*(\/\/|\/\*\*|\*)/.test(l))
        .join("\n");
    const authSrc = () => readFileSync(path.join(repoRoot, "app/lib/auth.ts"), "utf8");

    it("static: profile-role.ts has no imports and no metadata access", () => {
      const s = moduleSrc();
      assert.ok(!/^\s*import\s/m.test(s), "module must be dependency-free");
      assert.ok(!/\brequire\(/.test(s));
      assert.ok(!/user_metadata|raw_user_meta_data|app_metadata/.test(s));
    });

    it("static: no default role and no escape hatches", () => {
      const s = moduleSrc();
      assert.ok(!/\?\?\s*["']jobseeker["']|\|\|\s*["']jobseeker["']/.test(s));
      assert.ok(!/\bas any\b|:\s*any\b|@ts-(ignore|expect-error)|!\./.test(s));
    });

    it("static: auth.ts delegates to the shared decision and keeps the privileged own-id lookup", () => {
      const s = authSrc();
      assert.match(s, /from "\.\/profile-role"/);
      assert.match(s, /decideProfileRole\(lookups\)/);
      assert.match(s, /\.select\("id, is_active"\)\s*\.eq\("id", userId\)/);
      assert.ok(!/user_metadata\??\.role/.test(s));
    });
  });
});
