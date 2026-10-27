// Boundary validation: shared Zod schemas accept valid input and reject
// malformed or out-of-range input.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ZodTypeAny } from "zod";
import * as schemas from "../app/lib/validation-schemas";

const ok = (schema: ZodTypeAny, value: unknown) => assert.equal(schema.safeParse(value).success, true, JSON.stringify(value));
const bad = (schema: ZodTypeAny, value: unknown) => assert.equal(schema.safeParse(value).success, false, JSON.stringify(value));

describe("primitive schemas", () => {
  it("validates ids, emails, phones, urls and dates", () => {
    ok(schemas.uuidSchema, "123e4567-e89b-12d3-a456-426614174000");
    bad(schemas.uuidSchema, "not-a-uuid");
    assert.equal(schemas.emailSchema.parse("Juan@Example.COM"), "juan@example.com");
    bad(schemas.emailSchema, "juan@");
    ok(schemas.phoneSchema, "+63 (917) 555-0000");
    bad(schemas.phoneSchema, "call me");
    ok(schemas.urlSchema, "https://example.com/resume.pdf");
    bad(schemas.urlSchema, "example");
    ok(schemas.dateStringSchema, "");
    ok(schemas.dateStringSchema, "2026-10-27");
    bad(schemas.dateStringSchema, "yesterday-ish");
  });

  it("applies pagination defaults and bounds", () => {
    assert.deepEqual(schemas.paginationQuerySchema.parse({}), { limit: 10, offset: 0 });
    bad(schemas.paginationQuerySchema, { limit: "0" });
    bad(schemas.paginationQuerySchema, { limit: "101" });
    bad(schemas.paginationQuerySchema, { offset: "-1" });
  });
});

describe("auth and account schemas", () => {
  it("requires strong new passwords", () => {
    ok(schemas.changePasswordSchema, { currentPassword: "x", newPassword: "Secure123" });
    bad(schemas.changePasswordSchema, { currentPassword: "x", newPassword: "weakpass1" });
    bad(schemas.changePasswordSchema, { currentPassword: "x", newPassword: "NoNumberHere" });
    bad(schemas.passwordResetConfirmSchema, { token: "", newPassword: "Secure123" });
    ok(schemas.passwordResetConfirmSchema, { token: "t", newPassword: "Secure123" });
  });

  it("defaults the login role and rejects unknown roles", () => {
    assert.equal(schemas.loginRequestSchema.parse({ email: "a@b.co", password: "secret1" }).role, "jobseeker");
    bad(schemas.loginRequestSchema, { email: "a@b.co", password: "secret1", role: "superuser" });
    bad(schemas.loginRequestSchema, { email: "a@b.co", password: "123" });
  });

  it("validates verification and deletion requests", () => {
    ok(schemas.requestVerifyEmailSchema, { email: "a@b.co" });
    bad(schemas.requestVerifyEmailSchema, {});
    ok(schemas.requestAccountDeletionSchema, { currentPassword: "pw" });
    bad(schemas.requestAccountDeletionSchema, { currentPassword: "pw", reason: "x".repeat(2001) });
    ok(schemas.cancelAccountDeletionSchema, {});
    bad(schemas.cancelAccountDeletionSchema, { extra: true });
  });
});

describe("job and application schemas", () => {
  it("validates applications and status updates", () => {
    ok(schemas.jobApplicationSchema, { coverLetter: "I have five years of forklift experience in GenSan warehouses." });
    bad(schemas.jobApplicationSchema, { coverLetter: "too short" });
    bad(schemas.jobApplicationSchema, { coverLetter: "x".repeat(60), resume: "not a url" });
    ok(schemas.jobApplicationStatusUpdateSchema, { status: "hired" });
    bad(schemas.jobApplicationStatusUpdateSchema, { status: "maybe" });
    bad(schemas.employerApplicationStatusUpdateSchema, { status: "promoted" });
    ok(schemas.archiveJobSchema, { archived: true });
    bad(schemas.archiveJobSchema, { archived: "yes" });
    bad(schemas.employerJobsListQuerySchema, { status: "deleted" });
  });

  it("rejects empty job postings and invalid list filters", () => {
    for (const schema of [schemas.createJobPostingSchema, schemas.employerJobStatusUpdateSchema, schemas.updateJobStatusSchema, schemas.employerApplicationMessageSchema]) {
      bad(schema, {});
    }
    for (const schema of [schemas.jobsQuerySchema, schemas.adminJobsQuerySchema, schemas.adminUsersQuerySchema, schemas.employerApplicationsListQuerySchema]) {
      bad(schema, { limit: "1000" });
    }
  });
});

describe("misc schemas", () => {
  it("validates contact form and referral input", () => {
    ok(schemas.contactFormSchema, { name: "Ana", email: "ana@b.co", subject: "Hi", message: "Hello there, PESO!" });
    bad(schemas.contactFormSchema, { name: "Ana", email: "ana@b.co", subject: "Hi", message: "short" });
    bad(schemas.contactFormSchema, { name: "Ana", email: "ana@b.co", subject: "Hi", message: "Hello there, PESO!", category: "spam" });
    ok(schemas.referralSchema, { referrerEmail: "a@b.co", referrerName: "A", referreeName: "B", referreeEmail: "b@b.co" });
    bad(schemas.referralSchema, { referrerEmail: "a@b.co", referrerName: "A", referreeName: "", referreeEmail: "b@b.co" });
    ok(schemas.notificationPreferencesSchema, { emailNotifications: true });
    bad(schemas.notificationPreferencesSchema, { emailNotifications: "yes" });
  });

  it("exposes SRS industry codes and accepts empty partial updates where allowed", () => {
    assert.ok(Array.isArray(schemas.SRS_INDUSTRY_CODE_VALUES) && schemas.SRS_INDUSTRY_CODE_VALUES.length > 0);
    ok(schemas.employerAccountProfileUpdateSchema, {});
    bad(schemas.employerAccountProfileUpdateSchema, { totalPaidEmployees: -1 });
    for (const schema of [
      schemas.employerProfileUpdateSchema,
      schemas.jobseekerProfileUpdateSchema,
      schemas.updateJobPostingSchema,
      schemas.publishJobSchema,
      schemas.applicationFiltersSchema,
      schemas.adminDashboardQuerySchema,
      schemas.administrationUserManagementSchema,
      schemas.employerAccessRequestSchema,
      schemas.confirmVerifyEmailSchema,
      schemas.passwordResetRequestSchema,
      schemas.errorResponseSchema,
      schemas.successResponseSchema,
      schemas.paginatedResponseSchema,
    ]) {
      // Each schema must produce a parse result (never throw) on arbitrary input.
      assert.equal(typeof schema.safeParse({ unexpected: 1 }).success, "boolean");
      bad(schema, "not an object");
    }
  });
});
