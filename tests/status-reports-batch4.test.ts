// Offline checks for the 2026-10-21 status/report batch (docs/system-scan-2026-10-21.md, batch 4).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  REFERRAL_STATUS_LABELS,
  referralDbStatus,
  referralStatusDbValues,
  referralStatusLabel,
} from "../app/lib/referral-status";
import { exclusiveEndDate } from "../app/lib/report-dates";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("referral status vocabulary", () => {
  it("maps every spelling to one label and one stored value", () => {
    for (const [input, label, db] of [
      ["referred", "Pending", "referred"],
      ["pending", "Pending", "referred"],
      ["Pending", "Pending", "referred"],
      ["For Interview", "For Interview", "interview"],
      ["interview", "For Interview", "interview"],
      ["Hired", "Hired", "hired"],
      ["hired", "Hired", "hired"],
      ["REJECTED", "Rejected", "rejected"],
      ["withdrawn", "Withdrawn", "withdrawn"],
      [null, "Pending", "referred"],
    ] as const) {
      assert.equal(referralStatusLabel(input), label);
      assert.equal(referralDbStatus(input), db);
    }
  });

  it("query values cover canonical and legacy spellings", () => {
    assert.deepEqual(referralStatusDbValues("Hired"), ["hired", "Hired"]);
    assert.deepEqual(referralStatusDbValues("Pending"), ["referred", "pending", "Pending"]);
    for (const label of REFERRAL_STATUS_LABELS) {
      assert.equal(referralStatusLabel(referralStatusDbValues(label)[0]), label);
    }
  });

  it("referral writers store canonical values", () => {
    assert.match(read("app/api/referrals/[referralId]/status/route.ts"), /status: referralDbStatus\(normalizedStatus\)/);
    assert.match(read("app/api/referrals/route.ts"), /status: referralDbStatus\(referralStatus\)/);
  });

  it("no server query filters referrals by a title-case label", () => {
    for (const file of [
      "app/api/admin/analytics/placement-stats/route.ts",
      "app/api/admin/export/reports/dole/route.ts",
      "app/api/admin/reports/pes/route.ts",
      "app/api/summary/route.ts",
      "app/api/landing/testimonials/route.ts",
    ]) {
      assert.doesNotMatch(read(file), /\.eq\("status", "[A-Z]/, file);
    }
  });
});

describe("report dates", () => {
  it("makes date-only end bounds exclusive at the next day", () => {
    assert.equal(exclusiveEndDate("2026-10-31"), "2026-11-01");
    assert.equal(exclusiveEndDate("2026-12-31"), "2027-01-01");
    assert.equal(exclusiveEndDate("2026-10-31T12:00:00Z"), "2026-10-31T12:00:00Z");
  });

  it("LMI and PES reports use exclusive end bounds and date placements by hire transition", () => {
    for (const file of ["app/api/admin/reports/lmi/route.ts", "app/api/admin/reports/pes/route.ts"]) {
      assert.doesNotMatch(read(file), /\.lte\("(created_at|issued_at)", endDate\)/, file);
    }
    assert.match(read("app/api/admin/reports/pes/route.ts"), /dateHired: ref\.updated_at/);
    assert.match(read("app/api/admin/analytics/placement-stats/route.ts"), /gte\("updated_at", monthBounds\.start\)\.lt\("updated_at", monthBounds\.end\)/);
  });
});

describe("retired users table", () => {
  const files = [
    "app/api/admin/users/route.ts",
    "app/api/admin/analytics/export/route.ts",
    "app/api/admin/export/applicants/route.ts",
    "app/api/admin/export/reports/dole/route.ts",
    "app/api/admin/export/reports/masterlist/route.ts",
    "app/api/admin/export/reports/summary/route.ts",
    "app/api/charts/_utils.ts",
    "app/api/public/impact/route.ts",
    "app/api/summary/route.ts",
  ];
  for (const file of files) {
    it(`${file} does not query users`, () => assert.doesNotMatch(read(file), /from\("users"\)/));
  }

  it("unused broken dashboard routes answer 410 without data access", () => {
    for (const file of [
      "app/api/admin/analytics/job-seeker-alerts/route.ts",
      "app/api/admin/dashboard/activity/route.ts",
      "app/api/admin/dashboard/geographic/route.ts",
      "app/api/admin/dashboard/overview/route.ts",
    ]) {
      const src = read(file);
      assert.match(src, /retiredRouteResponse/);
      assert.doesNotMatch(src, /supabase/);
    }
  });

  it("admin users search is sanitized and the applicants export has no secrets", () => {
    assert.match(read("app/api/admin/users/route.ts"), /sanitizeSearchTerm\(search\)/);
    const exportSrc = read("app/api/admin/export/applicants/route.ts");
    assert.doesNotMatch(exportSrc, /select\("\*"\)/);
    const columns = exportSrc.slice(exportSrc.indexOf("APPLICANT_EXPORT_COLUMNS ="), exportSrc.indexOf("export async function"));
    assert.doesNotMatch(columns, /password_hash|religion|disability|civil_status/);
  });
});

describe("dashboard health probes", () => {
  it("check errors and avoid missing tables", () => {
    const src = read("app/admin/dashboard/_lib/data-loader.ts");
    assert.doesNotMatch(src, /from\("(skill_suggestions|account_email_verifications|backups)"\)/);
    assert.match(src, /if \(error\) throw error;/);
  });
});
