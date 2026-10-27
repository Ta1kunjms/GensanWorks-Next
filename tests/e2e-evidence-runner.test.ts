// The e2e evidence runner must read only E2E_* variables and never write
// emails or credentials into the evidence file.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error plain ESM script without type declarations
import { parseE2eEnv, scrubOutput } from "../scripts/run-e2e-evidence.mjs";

describe("e2e evidence runner", () => {
  it("reads only E2E_* lines and strips quotes", () => {
    const vars = parseE2eEnv(
      [
        "SUPABASE_SERVICE_ROLE_KEY=should-not-load",
        "E2E_ADMIN_EMAIL=admin@test.example",
        'E2E_ADMIN_PASSWORD="p@ss word"',
        "# E2E_COMMENTED=1",
        "E2E_ALLOW_MUTATIONS=1",
      ].join("\r\n")
    );
    assert.deepEqual(vars, {
      E2E_ADMIN_EMAIL: "admin@test.example",
      E2E_ADMIN_PASSWORD: "p@ss word",
      E2E_ALLOW_MUTATIONS: "1",
    });
  });

  it("masks emails, secrets and ANSI codes", () => {
    const out = scrubOutput("\x1b[32m✓\x1b[0m login as admin@test.example with SECRETKEY123\r\n", ["SECRETKEY123", ""]);
    assert.equal(out.includes("admin@test.example"), false);
    assert.equal(out.includes("SECRETKEY123"), false);
    assert.equal(out.includes("\x1b"), false);
    assert.match(out, /\[email\]/);
    assert.match(out, /\[redacted\]/);
  });
});
