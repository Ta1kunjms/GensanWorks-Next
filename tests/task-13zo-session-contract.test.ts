// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading — placeholders only. Covers Task 13Z-O:
// A. TYPE-LEVEL CHECK — compiled only by a TypeScript type check (e.g. the Next
//    build). tsx strips types, so the runtime run below does NOT prove it.
// B. RUNTIME checks of buildSessionForVerifiedUser / auth() through the real
//    profile-role resolver against an in-memory fake on supabaseAdmin.from.
// C. STATIC SOURCE CHECKS of app/lib/auth.ts and its layout consumers.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { User } from "@supabase/supabase-js";
import type { auth as AuthFn, AuthSession, MockAuthSession } from "@/lib/auth";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const USER_ID = "2a6c1f0e-8b3d-4c7a-9e5f-1d2b3c4a5e6f";

// A. TYPE-LEVEL: every member of auth()'s result must expose user.image, the exact
// property whose absence on the mock member failed the build at app/admin/layout.tsx:22.
type AuthResult = Awaited<ReturnType<typeof AuthFn>>;
type SessionUserImage = NonNullable<NonNullable<AuthResult>["user"]>["image"];
const imageNull: SessionUserImage = null;
const imageAbsent: SessionUserImage = undefined;
const mockFixture: MockAuthSession = { user: { id: USER_ID, role: "admin" } };

type Responder = () => { data: unknown; error: unknown };
type ProfileTable = "admins" | "employers" | "jobseekers";

function verifiedUser(userMetadata: Record<string, unknown>): User {
  return {
    id: USER_ID,
    email: "synthetic.user@example.test",
    app_metadata: {},
    user_metadata: userMetadata,
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
  };
}

describe("Task 13Z-O — Session type contract", () => {
  let authMod: typeof import("@/lib/auth");
  let supabaseAdmin: { from: unknown };
  let origFrom: unknown;
  let origFetch: typeof globalThis.fetch;
  let origWarn: typeof console.warn;
  let origError: typeof console.error;
  let fetchCalls: number;
  let savedNodeEnv: string | undefined;

  function installProfiles(rows: Partial<Record<ProfileTable, Responder>>) {
    supabaseAdmin.from = (table: ProfileTable) => {
      const result = rows[table]?.() ?? { data: null, error: null };
      const builder: Record<string, () => unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.maybeSingle = () => Promise.resolve(result);
      return builder;
    };
  }
  const activeRow = (active: boolean | null): Responder => () => ({ data: { id: USER_ID, is_active: active }, error: null });

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    origFrom = supabaseAdmin.from;
  });

  beforeEach(() => {
    savedNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    fetchCalls = 0;
    origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCalls++;
      throw new Error("unexpected network call in offline test");
    }) as typeof globalThis.fetch;
    origWarn = console.warn;
    origError = console.error;
    console.warn = () => {};
    console.error = () => {};
    authMod.__setMockAuthSession(undefined);
  });

  afterEach(() => {
    authMod.__setMockAuthSession(undefined);
    supabaseAdmin.from = origFrom;
    globalThis.fetch = origFetch;
    console.warn = origWarn;
    console.error = origError;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    assert.equal(fetchCalls, 0, "no network request may be made");
  });

  describe("B. RUNTIME — session shape and preserved authorization behavior", () => {
    it("type fixtures are well-formed at runtime", () => {
      assert.equal(imageNull, null);
      assert.equal(imageAbsent, undefined);
      assert.deepEqual(mockFixture, { user: { id: USER_ID, role: "admin" } });
    });

    it("verified active profile yields the explicit AuthSession shape with avatar image", async () => {
      installProfiles({ admins: activeRow(true) });
      const session: AuthSession | null = await authMod.buildSessionForVerifiedUser(
        verifiedUser({ name: "Synthetic Admin", avatar_url: "https://example.test/a.png" })
      );
      assert.ok(session);
      assert.deepEqual(Object.keys(session.user).sort(), ["email", "id", "image", "name", "role"]);
      assert.equal(session.user.id, USER_ID);
      assert.equal(session.user.role, "admin");
      assert.equal(session.user.name, "Synthetic Admin");
      assert.equal(session.user.email, "synthetic.user@example.test");
      assert.equal(session.user.image, "https://example.test/a.png");
      assert.equal(typeof session.expires, "string");
    });

    it("missing avatar yields image null, not a fabricated value", async () => {
      installProfiles({ jobseekers: activeRow(true) });
      const session = await authMod.buildSessionForVerifiedUser(verifiedUser({ name: "Synthetic Seeker" }));
      assert.equal(session?.user.image, null);
      assert.equal(session?.user.role, "jobseeker");
    });

    it("no profile row returns null; role is never defaulted to jobseeker", async () => {
      installProfiles({});
      assert.equal(await authMod.buildSessionForVerifiedUser(verifiedUser({ role: "jobseeker" })), null);
    });

    it("forged user_metadata role is ignored; profile table decides", async () => {
      installProfiles({ employers: activeRow(true) });
      const session = await authMod.buildSessionForVerifiedUser(verifiedUser({ role: "admin" }));
      assert.equal(session?.user.role, "employer");
    });

    for (const active of [false, null] as const) {
      it(`inactive profile (is_active=${active}) returns null`, async () => {
        installProfiles({ admins: activeRow(active) });
        assert.equal(await authMod.buildSessionForVerifiedUser(verifiedUser({})), null);
      });
    }

    it("conflicting profiles across role tables return null", async () => {
      installProfiles({ admins: activeRow(true), employers: activeRow(true) });
      assert.equal(await authMod.buildSessionForVerifiedUser(verifiedUser({})), null);
    });

    it("lookup error returns null", async () => {
      installProfiles({ admins: () => ({ data: null, error: { message: "synthetic failure" } }) });
      assert.equal(await authMod.buildSessionForVerifiedUser(verifiedUser({})), null);
    });

    it("mock session (with or without image) is honored only under NODE_ENV=test", async () => {
      const withImage: MockAuthSession = { user: { id: USER_ID, role: "admin", image: null } };
      authMod.__setMockAuthSession(withImage);
      assert.equal(await authMod.auth(), withImage);
      authMod.__setMockAuthSession(mockFixture);
      assert.equal(await authMod.auth(), mockFixture);
    });

    it("mock session is ignored outside NODE_ENV=test (no production bypass)", async () => {
      authMod.__setMockAuthSession(mockFixture);
      process.env.NODE_ENV = "production";
      const result = await authMod.auth();
      assert.notEqual(result, mockFixture);
      assert.equal(result, null);
    });
  });

  describe("C. STATIC SOURCE CHECKS (source text only)", () => {
    const src = () => readSource("app/lib/auth.ts");

    it("static: auth() and the session builder declare explicit return contracts", () => {
      assert.match(src(), /export const auth = async \(\): Promise<AuthSession \| MockAuthSession \| null> =>/);
      assert.match(src(), /export async function buildSessionForVerifiedUser\(user: User\): Promise<AuthSession \| null>/);
      assert.match(src(), /image: string \| null;/);
      assert.match(src(), /image\?: string \| null/);
    });

    it("static: no escape hatches in auth.ts", () => {
      assert.ok(!/@ts-(ignore|expect-error|nocheck)/.test(src()));
      assert.ok(!/\bas any\b/.test(src()));
      assert.ok(!/:\s*any\b(?!\))/.test(src().replace(/catch \(error: any\)/, "")), "no new any annotations");
    });

    it("static: mock bypass remains gated on NODE_ENV === \"test\"", () => {
      assert.match(src(), /if \(process\.env\.NODE_ENV === "test" && mockSessionStore !== undefined\)/);
    });

    it("static: both layout consumers read session.user?.image and were not edited to cast around it", () => {
      for (const rel of ["app/admin/layout.tsx", "app/jobseeker/layout.tsx"]) {
        assert.ok(readSource(rel).includes("image: session.user?.image ?? null,"), rel);
      }
    });
  });
});
