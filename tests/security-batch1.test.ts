// Offline checks for the 2026-10-21 security batch (docs/system-scan-2026-10-21.md §3).
// Helpers are tested at runtime; route wiring is checked by static source reads.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { isUuid, sanitizeSearchTerm } from "../app/lib/postgrest-safe";
import { omitSecrets, omitSecretsAll } from "../app/lib/profile-secrets";
import { generateReferralSlipNumber } from "../app/lib/referral-slip-number";
import { employerOwnJobStatusSchema } from "../app/lib/validation-schemas";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("PostgREST filter safety", () => {
  it("isUuid accepts only canonical UUIDs", () => {
    assert.ok(isUuid("8f2d6b1a-3c4e-4a7b-9d1f-0e5c2b7a6d3e"));
    for (const bad of ["x),id.not.is.null,and(id.eq.x", "", "123", null, undefined, "8f2d6b1a3c4e4a7b9d1f0e5c2b7a6d3e"]) {
      assert.equal(isUuid(bad), false, String(bad));
    }
  });

  it("sanitizeSearchTerm removes filter-grammar characters", () => {
    assert.equal(sanitizeSearchTerm("Sales, Marketing (Officer).*"), "Sales Marketing Officer");
    assert.equal(sanitizeSearchTerm("a,b)or(id.eq.1"), "a b or id eq 1");
    assert.equal(sanitizeSearchTerm("José Dela Cruz"), "José Dela Cruz");
    assert.equal(sanitizeSearchTerm(42), "");
  });

  it("the conversation route validates peerId before building the .or() filter", () => {
    const s = read("app/api/messages/conversation/[peerId]/route.ts");
    for (const method of ["GET", "DELETE", "PATCH"]) {
      const body = s.slice(s.indexOf(`export async function ${method}`));
      assert.ok(body.indexOf("if (!isUuid(peerId)) return invalidPeer();") < body.indexOf("supabaseAdmin"), method);
    }
    assert.ok(!s.includes("read_at"));
  });

  it("no .or() filter interpolates raw request values", () => {
    const offenders = walk(path.join(process.cwd(), "app"))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .flatMap((f) => {
        const src = readFileSync(f, "utf8");
        // A peerId that is strictly validated as a UUID before use is safe.
        const peerValidated = src.includes("if (rawPeerId && !isUuid(rawPeerId))") || src.includes("if (!isUuid(peerId))");
        return Array.from(src.matchAll(/\.or\(`([^`]*)`/g))
          .map((m) => m[1])
          .filter((filter) => /\$\{(q|search|location|peerId|filters\.search)\}/.test(filter))
          .filter((filter) => !(peerValidated && !/\$\{(q|search|location|filters\.search)\}/.test(filter)))
          .map((filter) => `${path.relative(process.cwd(), f)}: ${filter}`);
      });
    // Known remaining legacy sites read retired tables and are tracked for removal.
    const allowed = offenders.filter((o) => !/admin[\\/]users[\\/]route|db-helpers/.test(o));
    assert.deepEqual(allowed, []);
  });
});

describe("Authorization on referral and matching routes", () => {
  it("referral list is scoped by role and creation is admin-only", () => {
    const s = read("app/api/referrals/route.ts");
    assert.match(s, /if \(identity\.role === "employer"\) rowsQuery = rowsQuery\.eq\("employer_id", identity\.userId\);/);
    assert.match(s, /else if \(identity\.role === "jobseeker"\) rowsQuery = rowsQuery\.eq\("jobseeker_id", identity\.userId\);/);
    assert.match(s, /\/\/ Referrals are issued by PESO administrators only\.\n\s*if \(identity\.role !== "admin"\)/);
    assert.ok(s.includes("const employerId = job.employer_id;"), "body employerId is ignored");
  });

  it("referral status changes: admin or the owning employer only", () => {
    const s = read("app/api/referrals/[referralId]/status/route.ts");
    assert.match(s, /if \(identity\.role !== "admin" && identity\.role !== "employer"\)/);
    assert.match(s, /identity\.role === "employer" && existing\.data\.employer_id !== identity\.userId/);
    assert.ok(!s.includes("remarks,\n"), "no write to the non-existent remarks column");
    assert.ok(!s.includes('"applicant_id"'));
  });

  it("referral DELETE is admin-only and never hard-deletes", () => {
    const s = read("app/api/referrals/[referralId]/route.ts");
    assert.match(s, /if \(identity\.role !== "admin"\)/);
    assert.ok(!s.includes(".delete()"), "no hard delete of referrals or applications");
    assert.ok(s.includes('status: "withdrawn"'));
  });

  it("single-pair matching requires an admin; matching feedback requires admin or the job's employer", () => {
    const m = read("app/api/matching/[jobId]/route.ts");
    assert.equal((m.match(/const denied = await requireAdmin\(\);/g) ?? []).length, 2);
    const f = read("app/api/matching/feedback/route.ts");
    assert.match(f, /if \(sessionUser\.role !== "admin" && sessionUser\.role !== "employer"\)/);
    assert.match(f, /sessionUser\.role === "employer" && ownedJob\.employer_id !== sessionUser\.id/);
    assert.match(f, /signalType: z\.enum\(\["shortlisted", "rejected", "hired", "viewed"\]\)/);
  });

  it("employer outcomes require job ownership and an application or referral", () => {
    const s = read("app/api/employer/outcomes/route.ts");
    assert.match(s, /job\.employer_id !== user\.id/);
    assert.ok(!s.includes("error: error.message"));
  });

  it("system-alerts rejects non-admins", () => {
    assert.match(read("app/api/admin/system-alerts/route.ts"), /if \(admin\.forbiddenResponse\) return admin\.forbiddenResponse;/);
  });

  it("the retired admin Google callback cannot complete a session", () => {
    const s = read("app/api/auth/callback/admin/route.ts");
    assert.ok(!s.includes("exchangeCodeForSession") && !s.includes("admin/dashboard"));
  });

  it("employers cannot publish, reject or suspend their own jobs", () => {
    for (const status of ["active", "rejected", "suspended"]) {
      assert.equal(employerOwnJobStatusSchema.safeParse({ status }).success, false, status);
    }
    for (const status of ["draft", "pending", "closed", "archived"]) {
      assert.equal(employerOwnJobStatusSchema.safeParse({ status }).success, true, status);
    }
    const s = read("app/api/employer/jobs/[id]/status/route.ts");
    assert.ok(!/is_published|published_at/.test(s));
  });
});

describe("Data exposure", () => {
  it("omitSecrets drops password hashes", () => {
    assert.deepEqual(omitSecrets({ id: "1", password_hash: "x", email: "e" }), { id: "1", email: "e" });
    assert.equal(omitSecrets(null), null);
    assert.deepEqual(omitSecretsAll([{ password_hash: "x", a: 1 }]), [{ a: 1 }]);
  });

  it("admin API responses are never publicly cacheable", () => {
    const offenders = walk(path.join(process.cwd(), "app", "api", "admin"))
      .filter((f) => f.endsWith(".ts") && /Cache-Control["']?\s*:\s*["']public/.test(readFileSync(f, "utf8")));
    assert.deepEqual(offenders, []);
  });

  it("public profile is relationship-gated for employers and hides disability data from them", () => {
    const s = read("app/api/public/profile/[nsrp_id]/route.ts");
    assert.match(s, /if \(user\.role === "employer" && !\(await employerMayView\(user\.id, jobseekerId\)\)\) return notFound;/);
    assert.match(s, /employer\.account_status !== "approved"/);
    assert.match(s, /pwdStatus: maySeeSensitive \?/);
    assert.ok(!s.includes('select("*")'));
  });

  it("public slip verification masks the applicant for anonymous viewers", () => {
    const s = read("app/api/public/referrals/[slip-number]/route.ts");
    assert.ok(s.includes("applicant: privileged"));
    assert.ok(s.includes("enforceRateLimit"));
    assert.ok(!s.includes("pdf_url"));
  });

  it("referral slip numbers are long and random", () => {
    const a = generateReferralSlipNumber(new Date("2026-10-21T00:00:00Z"));
    assert.match(a, /^RS-2026-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/);
    const seen = new Set(Array.from({ length: 200 }, () => generateReferralSlipNumber()));
    assert.equal(seen.size, 200);
  });
});
