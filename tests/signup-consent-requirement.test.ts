// Synthetic, offline, schema-validation-boundary test. No live Supabase
// calls, no createUser(), no database access.
//
// Scope note (explicit, per Task 3 approval): this file proves that the
// Zod request schemas reject signup payloads without affirmative consent,
// and that PRIVACY_NOTICE_VERSION is a well-formed development-only value.
// It does NOT and CANNOT prove end-to-end persistence — that
// createUser() succeeds, that the on_auth_user_created trigger inserts a
// profile row, and that the follow-up consent UPDATE actually lands on
// that row — because all three require a live, seeded Supabase project.
// That remains a separate, not-yet-completed test gap (see Task 3 report).

import { test } from "node:test";
import assert from "node:assert/strict";
import { signupJobseekerRequestSchema, signupEmployerRequestSchema } from "../app/lib/validation-schemas";
import { PRIVACY_NOTICE_VERSION } from "../app/lib/privacy-notice-version";

function validJobseekerPayload(consentAccepted: unknown) {
  return {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.synthetic@example.test",
    password: "Synthetic1Pass",
    consentAccepted,
  };
}

function validEmployerPayload(consentAccepted: unknown) {
  return {
    email: "employer.synthetic@example.test",
    password: "Synthetic1Pass",
    establishmentName: "Synthetic Testing Co.",
    consentAccepted,
  };
}

test("jobseeker signup schema: consentAccepted=false is rejected", () => {
  const result = signupJobseekerRequestSchema.safeParse(validJobseekerPayload(false));
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join("."));
    assert.ok(paths.includes("consentAccepted"), "error must be attributed to consentAccepted");
  }
});

test("jobseeker signup schema: missing consentAccepted is rejected", () => {
  const payload = validJobseekerPayload(true) as Record<string, unknown>;
  delete payload.consentAccepted;
  const result = signupJobseekerRequestSchema.safeParse(payload);
  assert.equal(result.success, false);
});

test("jobseeker signup schema: consentAccepted=true is accepted at the schema layer", () => {
  const result = signupJobseekerRequestSchema.safeParse(validJobseekerPayload(true));
  assert.equal(result.success, true);
});

test("employer signup schema: consentAccepted=false is rejected", () => {
  const result = signupEmployerRequestSchema.safeParse(validEmployerPayload(false));
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join("."));
    assert.ok(paths.includes("consentAccepted"), "error must be attributed to consentAccepted");
  }
});

test("employer signup schema: missing consentAccepted is rejected", () => {
  const payload = validEmployerPayload(true) as Record<string, unknown>;
  delete payload.consentAccepted;
  const result = signupEmployerRequestSchema.safeParse(payload);
  assert.equal(result.success, false);
});

test("employer signup schema: consentAccepted=true is accepted at the schema layer", () => {
  const result = signupEmployerRequestSchema.safeParse(validEmployerPayload(true));
  assert.equal(result.success, true);
});

test("PRIVACY_NOTICE_VERSION is a non-empty development-only placeholder", () => {
  assert.equal(typeof PRIVACY_NOTICE_VERSION, "string");
  assert.ok(PRIVACY_NOTICE_VERSION.length > 0);
  assert.match(PRIVACY_NOTICE_VERSION, /development/);
  assert.ok(
    /synthetic/.test(PRIVACY_NOTICE_VERSION) || /pending/.test(PRIVACY_NOTICE_VERSION),
    "PRIVACY_NOTICE_VERSION must contain 'synthetic' or 'pending'"
  );
});
