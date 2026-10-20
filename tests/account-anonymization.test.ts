// Offline tests for stage-2 account anonymization (pilot constraint #3).
// Pure helpers are tested directly; the route is checked by static source reads.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  anonymizedEmail,
  buildAnonymizedProfileUpdate,
  clearedMetadata,
  decideAnonymization,
  isAnonymizedEmail,
  parseRetentionDays,
  retentionCutoff,
} from "../app/lib/account-anonymization";

const USER_ID = "00000000-0000-4000-8000-0000000000aa";
const ROUTE = "app/api/admin/account-deletion/anonymize/route.ts";
const readSource = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Account anonymization — eligibility", () => {
  const PROCESSED_AT = "2026-06-01T00:00:00.000Z";
  const deactivated = { email: "a@example.test", is_active: false, updated_at: PROCESSED_AT };

  it("anonymizes only an existing, deactivated profile unchanged since stage 1", () => {
    assert.equal(decideAnonymization(null, PROCESSED_AT), "skip_missing");
    assert.equal(decideAnonymization({ ...deactivated, is_active: true }, PROCESSED_AT), "skip_active");
    assert.equal(decideAnonymization({ ...deactivated, is_active: null }, PROCESSED_AT), "skip_active");
    assert.equal(decideAnonymization(deactivated, PROCESSED_AT), "anonymize");
  });

  it("skips a profile changed after the request was processed (e.g. re-activated, then suspended)", () => {
    assert.equal(decideAnonymization({ ...deactivated, updated_at: "2026-07-01T00:00:00.000Z" }, PROCESSED_AT), "skip_changed");
    assert.equal(decideAnonymization({ email: "a@example.test", is_active: false }, PROCESSED_AT), "skip_changed");
    assert.equal(decideAnonymization(deactivated, null), "skip_changed");
  });

  it("tolerates a database-stamped updated_at within minutes of stage 1", () => {
    assert.equal(decideAnonymization({ ...deactivated, updated_at: "2026-06-01T00:00:03.000Z" }, PROCESSED_AT), "anonymize");
    assert.equal(decideAnonymization({ ...deactivated, updated_at: "2026-06-01T00:06:00.000Z" }, PROCESSED_AT), "skip_changed");
  });

  it("resumes a profile anonymized by an interrupted earlier run", () => {
    assert.equal(
      decideAnonymization({ email: anonymizedEmail(USER_ID), is_active: false, updated_at: "2026-10-20T00:00:00.000Z" }, PROCESSED_AT),
      "resume"
    );
  });

  it("clears every existing user_metadata key with null", () => {
    assert.deepEqual(clearedMetadata({ full_name: "Juan", avatar_url: "x", email: "e" }), {
      full_name: null,
      avatar_url: null,
      email: null,
    });
    assert.deepEqual(clearedMetadata(undefined), {});
  });

  it("recognizes anonymized emails only on the reserved .invalid domain", () => {
    assert.ok(isAnonymizedEmail(anonymizedEmail(USER_ID)));
    assert.ok(!isAnonymizedEmail("user@example.test"));
    assert.ok(!isAnonymizedEmail(null));
  });
});

describe("Account anonymization — profile update", () => {
  const row = {
    id: USER_ID,
    email: "real@example.test",
    first_name: "Juan",
    last_name: "Dela Cruz",
    phone: "09170000000",
    birth_date: "1990-01-01",
    tin: "123",
    nsrp_id: "NSRP-1",
    password_hash: "hash",
    city: "General Santos City",
    gender: "Male",
    employment_status: "Unemployed",
    other_skills: "Welding",
    is_active: false,
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("overwrites direct identifiers and keeps non-identifying aggregate fields", () => {
    const now = new Date("2026-10-20T00:00:00.000Z");
    const update = buildAnonymizedProfileUpdate("jobseeker", USER_ID, row, now);
    assert.equal(update.email, anonymizedEmail(USER_ID));
    assert.equal(update.first_name, "Deleted");
    assert.equal(update.last_name, "User");
    assert.equal(update.phone, null);
    assert.equal(update.birth_date, null);
    assert.equal(update.tin, null);
    assert.equal(update.nsrp_id, null);
    assert.equal(update.password_hash, "anonymized");
    assert.equal(update.updated_at, now.toISOString());
    for (const kept of ["city", "gender", "employment_status", "other_skills", "is_active", "id"]) {
      assert.ok(!(kept in update), `${kept} must not be changed`);
    }
  });

  it("never writes columns the fetched row does not have", () => {
    const update = buildAnonymizedProfileUpdate("jobseeker", USER_ID, { id: USER_ID, email: "x@example.test" });
    assert.deepEqual(Object.keys(update), ["email"]);
  });

  it("anonymizes employer contact details but keeps the establishment record", () => {
    const update = buildAnonymizedProfileUpdate("employer", USER_ID, {
      email: "hr@example.test",
      establishment_name: "Synthetic Corp",
      contact_person: "Maria",
      contact_phone: "0917",
    });
    assert.equal(update.contact_person, null);
    assert.equal(update.contact_phone, null);
    assert.equal(update.email, anonymizedEmail(USER_ID));
    assert.ok(!("establishment_name" in update));
  });
});

describe("Account anonymization — retention setting", () => {
  it("stays disabled unless a positive whole number of days is configured", () => {
    for (const bad of [undefined, "", "0", "-5", "abc", "1.5"]) {
      assert.equal(parseRetentionDays(bad), null, String(bad));
    }
    assert.equal(parseRetentionDays("90"), 90);
  });

  it("computes the cutoff from the retention period", () => {
    const now = new Date("2026-10-20T00:00:00.000Z");
    assert.equal(retentionCutoff(now, 30).toISOString(), "2026-09-20T00:00:00.000Z");
  });
});

describe("Account anonymization — route (static source checks)", () => {
  const s = () => readSource(ROUTE);

  it("is admin-only with a recent sign-in, and has no cron-secret path", () => {
    assert.match(s(), /requireAuth: true,\s*allowedRoles: \["admin"\],\s*requireRecentAuthMinutes: 15/);
    assert.ok(!/cron|x-cron-secret/i.test(s()));
  });

  it("anonymizes auth user, then profile, then all of the user's request rows (completion marker last)", () => {
    const src = s();
    const auth = src.indexOf("auth.admin.updateUserById(");
    const profile = src.indexOf(".update(update)");
    const requests = src.indexOf('.eq("user_id", userId)');
    assert.ok(auth > 0 && profile > auth && requests > profile, "step order must be auth -> profile -> requests");
    assert.match(src, /user_metadata: clearedMetadata\(/);
    assert.match(src, /\.order\("processed_at", \{ ascending: false \}\)/, "latest request per user must decide");
    assert.match(src, /\.not\("email", "like", `%@\$\{ANONYMIZED_EMAIL_DOMAIN\}`\)/);
  });

  it("is a dry run unless execute is explicitly true", () => {
    assert.match(s(), /const execute = body\?\.execute === true;/);
    assert.match(s(), /if \(!execute\) continue;/);
  });

  it("refuses to run without a configured retention period", () => {
    assert.match(s(), /parseRetentionDays\(process\.env\.ACCOUNT_ANONYMIZATION_RETENTION_DAYS\)/);
    assert.match(s(), /status: 409/);
  });

  it("never hard-deletes and records an audit entry for executed runs", () => {
    assert.ok(!/\.delete\(|deleteUser/.test(s()));
    assert.match(s(), /logAuditAction\(/);
  });
});
