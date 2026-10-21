// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13O — Account-Flow Safety Guardrails (Batch A):
// 1. Reset confirmation route disabled (HTTP 501).
// 2. Change password route disabled (HTTP 501).
// 3. Rogue jobseeker account deletion route disabled (HTTP 501).
// 4. Cancellation route column defect corrected to canonical snake_case.
// 5. /api/auth/me response sanitized to exclude password_hash.
// 6. Scope guard for no "users" table regressions and no conflict markers.

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { POST as resetConfirmPOST } from "@/api/auth/reset-password/confirm/route";
import { POST as changePasswordPOST } from "@/api/auth/change-password/route";
import { DELETE as jobseekerAccountDELETE } from "@/api/jobseeker/account/route";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Task 13O — Account-Flow Safety Guardrails", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchCallCount = 0;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCallCount = 0;
    // @ts-expect-error - test instrumentation, restored in afterEach
    globalThis.fetch = (...args: unknown[]) => {
      fetchCallCount += 1;
      throw new Error(
        `Unexpected network/fetch call during offline test: ${JSON.stringify(args)}`
      );
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("1. Reset confirmation route (app/api/auth/reset-password/confirm/route.ts)", () => {
    it("returns HTTP 501", async () => {
      const res = await resetConfirmPOST();
      assert.equal(res.status, 501);
    });

    it("returns exactly the generic disabled error message", async () => {
      const res = await resetConfirmPOST();
      const body = await res.json();
      assert.deepEqual(body, {
        error: "Password changes are temporarily unavailable.",
      });
    });

    it("invoking it triggers zero fetch calls", async () => {
      await resetConfirmPOST();
      assert.equal(fetchCallCount, 0, "No network/fetch call must occur");
    });

    it("source contains no password_hash, hashPassword, consumeLifecycleToken, or Supabase operational references", () => {
      const source = readSource("app/api/auth/reset-password/confirm/route.ts");
      const forbidden = [
        "password_hash",
        "hashPassword",
        "consumeLifecycleToken",
        ".from(",
        ".rpc(",
        "supabaseAdmin",
        "createClient",
      ];
      for (const token of forbidden) {
        assert.ok(
          !source.includes(token),
          `reset-password/confirm/route.ts source must not contain "${token}"`
        );
      }
    });
  });

  describe("2. Change-password route (app/api/auth/change-password/route.ts)", () => {
    it("returns HTTP 501", async () => {
      const res = await changePasswordPOST();
      assert.equal(res.status, 501);
    });

    it("returns exactly the generic disabled error message", async () => {
      const res = await changePasswordPOST();
      const body = await res.json();
      assert.deepEqual(body, {
        error: "Password changes are temporarily unavailable.",
      });
    });

    it("invoking it triggers zero fetch calls", async () => {
      await changePasswordPOST();
      assert.equal(fetchCallCount, 0, "No network/fetch call must occur");
    });

    it("source contains no password verification/hash/update or Supabase operations", () => {
      const source = readSource("app/api/auth/change-password/route.ts");
      const forbidden = [
        "verifyPassword",
        "hashPassword",
        "updatePassword",
        "getPasswordHash",
        "password_hash",
        ".from(",
        ".rpc(",
        "supabaseAdmin",
        "createClient",
      ];
      for (const token of forbidden) {
        assert.ok(
          !source.includes(token),
          `change-password/route.ts source must not contain "${token}"`
        );
      }
    });
  });

  describe("3. Jobseeker account deletion handler (app/api/jobseeker/account/route.ts)", () => {
    it("returns HTTP 501", async () => {
      const res = await jobseekerAccountDELETE();
      assert.equal(res.status, 501);
    });

    it("returns exactly the generic account deletion disabled error message", async () => {
      const res = await jobseekerAccountDELETE();
      const body = await res.json();
      assert.deepEqual(body, {
        error: "Account deletion is not available.",
      });
    });

    it("invoking it triggers zero fetch calls", async () => {
      await jobseekerAccountDELETE();
      assert.equal(fetchCallCount, 0, "No network/fetch call must occur");
    });

    it("source contains no deleteUser, .delete(, or supabaseAdmin operational reference", () => {
      const source = readSource("app/api/jobseeker/account/route.ts");
      const forbidden = [
        "deleteUser",
        ".delete(",
        "supabaseAdmin",
        "createClient",
        "auth.admin",
      ];
      for (const token of forbidden) {
        assert.ok(
          !source.includes(token),
          `jobseeker/account/route.ts source must not contain "${token}"`
        );
      }
    });
  });

  describe("4. Cancellation route (app/api/auth/account-deletion/cancel/route.ts)", () => {
    // 2026-10-22: live account_deletion_requests has no cancelled_at column; the
    // cancellation time is the updated_at of a status="cancelled" row.
    it("source writes status cancelled and updated_at, and no cancelled_at", () => {
      const source = readSource("app/api/auth/account-deletion/cancel/route.ts");
      assert.ok(
        !source.includes("cancelled_at:"),
        "cancel route must not write the missing cancelled_at column"
      );
      assert.ok(
        source.includes('status: "cancelled"'),
        "cancel route must set status cancelled"
      );
      assert.ok(
        source.includes("updated_at:"),
        "cancel route must write updated_at"
      );
    });

    it("source does not contain legacy camelCase cancelledAt or updatedAt", () => {
      const source = readSource("app/api/auth/account-deletion/cancel/route.ts");
      assert.ok(
        !source.includes("cancelledAt"),
        "cancel route must not contain cancelledAt"
      );
      assert.ok(
        !source.includes("updatedAt"),
        "cancel route must not contain updatedAt"
      );
    });
  });

  describe("5. Password hash leakage prevention (app/api/auth/me/route.ts & app/lib/auth-utils.ts)", () => {
    it("app/lib/auth-utils.ts exports sanitizeProfile helper that strips password_hash", () => {
      const source = readSource("app/lib/auth-utils.ts");
      assert.ok(
        source.includes("export function sanitizeProfile"),
        "auth-utils.ts must export sanitizeProfile"
      );
      assert.ok(
        source.includes("password_hash:"),
        "sanitizeProfile must destructure and remove password_hash"
      );
    });

    it("app/api/auth/me/route.ts source explicitly excludes password_hash before building response", () => {
      const source = readSource("app/api/auth/me/route.ts");
      assert.ok(
        source.includes("password_hash:"),
        "/api/auth/me must explicitly destructure/remove password_hash"
      );
      assert.ok(
        source.includes("profile: sanitizedProfile"),
        "/api/auth/me must return sanitizedProfile rather than raw unfiltered profile"
      );
      assert.ok(
        !source.includes("profile,\n"),
        "/api/auth/me must not return raw un-sanitized profile"
      );
    });
  });

  describe("6. Scope guard and integrity checks", () => {
    const targetFiles = [
      "app/api/auth/reset-password/confirm/route.ts",
      "app/api/auth/change-password/route.ts",
      "app/api/jobseeker/account/route.ts",
      "app/api/auth/account-deletion/cancel/route.ts",
      "app/api/auth/me/route.ts",
      "app/lib/auth-utils.ts",
    ];

    it("none of the modified Task 13O files introduce .from('users') or .from(\"users\")", () => {
      for (const relPath of targetFiles) {
        const source = readSource(relPath);
        assert.ok(
          !source.includes('.from("users")') && !source.includes(".from('users')"),
          `${relPath} must not reference the retired users table`
        );
      }
    });

    it("none of the modified Task 13O files contain merge-conflict markers", () => {
      const conflictMarkers = ["<<<<<<<", "=======", ">>>>>>>"];
      for (const relPath of targetFiles) {
        const source = readSource(relPath);
        for (const marker of conflictMarkers) {
          assert.ok(
            !source.includes(marker),
            `${relPath} must not contain merge-conflict marker "${marker}"`
          );
        }
      }
    });
  });
});
