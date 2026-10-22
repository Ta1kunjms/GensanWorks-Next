// UI cleanup Step 3: native dialogs replaced, modal semantics, loading skeletons and
// dashboard error states. Static source checks plus the opt-in fetcher error mode.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  fetchEmployerApplicationsPreview,
  fetchEmployerDashboardData,
  fetchJobseekerDashboardData,
} from "@/lib/dashboard-data";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

function findLoadingFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findLoadingFiles(full));
    else if (entry.name === "loading.tsx") out.push(path.relative(process.cwd(), full));
  }
  return out;
}

const failing = async (): Promise<Response> =>
  new Response(JSON.stringify({ error: "synthetic failure detail" }), { status: 500 });

describe("native dialogs replaced", () => {
  it("destructive and archive actions use the shared confirm dialog", () => {
    for (const file of [
      "app/admin/referrals/page.tsx",
      "app/admin/users/page.tsx",
      "app/employer/jobs/page.tsx",
    ]) {
      const src = read(file);
      assert.match(src, /useConfirm\(\)/, file);
      assert.doesNotMatch(src, /window\.confirm\(/, file);
    }
  });

  it("newsletter and matching messages make no false claims", () => {
    assert.doesNotMatch(read("app/page.tsx"), /Thank you for subscribing/);
    assert.match(read("app/page.tsx"), /Newsletter sign-up is not available yet\./);
    assert.doesNotMatch(read("app/employer/matching/[job_id]/page.tsx"), /matching accuracy/i);
  });
});

describe("modals use the shared dialog", () => {
  for (const file of [
    "app/components/notifications-panel.tsx",
    "app/components/admin/referral-slip-generator.tsx",
    "app/admin/employer-approvals/[id]/page.tsx",
  ]) {
    it(file, () => {
      const src = read(file);
      assert.match(src, /from "@\/components\/ui\/dialog"/);
      assert.match(src, /<DialogTitle/);
      assert.doesNotMatch(src, /fixed inset-0/);
    });
  }

  it("notifications panel keeps its realtime transport", () => {
    assert.match(read("app/components/notifications-panel.tsx"), /from "socket\.io-client"/);
  });

  it("dialog content returns focus to the opener when there is no trigger", () => {
    const src = read("app/components/ui/dialog.tsx");
    assert.match(src, /onCloseAutoFocus=/);
    assert.match(src, /target\?\.isConnected\) target\.focus\(\)/);
  });
});

describe("Step 3 review fixes", () => {
  it("SRS reject dialog shows its own errors and a described, required reason", () => {
    const src = read("app/admin/employer-approvals/[id]/page.tsx");
    assert.match(src, /<p role="alert"[^>]*>\s*\{error\}/);
    assert.match(src, /aria-required="true"/);
    assert.match(src, /aria-describedby="srs-rejection-hint"/);
    assert.match(src, /if \(!open\) \{\n\s+setRejectionReason\(""\);/);
  });

  it("employer job delete/archive results use sonner toasts", () => {
    const src = read("app/employer/jobs/page.tsx");
    assert.match(src, /sonnerToast\.success\("Job archived"/);
    assert.match(src, /sonnerToast\.error\("Error", \{ description: "Failed to archive job", duration: 6000 \}\)/);
  });

  it("referral QR dialog closes while loading and ignores late responses", () => {
    const src = read("app/components/notifications-panel.tsx");
    assert.match(src, /open=\{selectedSlipId !== null\}/);
    assert.match(src, /if \(slipRequestRef\.current !== token\) return;/);
    assert.match(src, /sr-only">Loading referral slip…/);
  });

  it("dashboards keep ErrorState mounted while retrying and refocus after success", () => {
    for (const file of [
      "app/employer/dashboard/page.tsx",
      "app/jobseeker/dashboard/page.tsx",
      "app/admin/dashboard/_components/admin-dashboard-client.tsx",
    ]) {
      const src = read(file);
      assert.match(src, /focusAfterRetryRef\.current = true;/, file);
      assert.match(src, /headingRef\.current\?\.focus\(\)/, file);
      assert.match(src, /tabIndex=\{-1\}/, file);
    }
    assert.match(read("app/jobseeker/dashboard/page.tsx"), /retry: 1,/);
    const employer = read("app/employer/dashboard/page.tsx");
    assert.match(employer, /fetchEmployerApplicationsPreview\(\),/);
    assert.doesNotMatch(employer, /setLoading\(true\);\n\s+setLoadFailed\(false\);/);
  });
});

describe("loading skeletons", () => {
  const files = findLoadingFiles(path.join(process.cwd(), "app"));

  it("finds the route loading files", () => {
    assert.ok(files.length >= 9, `found ${files.length}`);
  });

  for (const file of files) {
    it(`${file} renders content only, without a duplicate sidebar or gradients`, () => {
      const src = read(file);
      assert.doesNotMatch(src, /Sidebar/);
      assert.doesNotMatch(src, /<aside\b/);
      assert.doesNotMatch(src, /bg-gradient-to-/);
      assert.match(src, /LoadingRegion/);
    });
  }

  it("jobseeker dashboard skeleton matches the 6 stat cards", () => {
    assert.match(read("app/jobseeker/dashboard/loading.tsx"), /StatGridSkeleton[\s\S]*?count=\{6\}/);
  });
});

describe("dashboard error states", () => {
  for (const file of ["app/employer/dashboard/page.tsx", "app/jobseeker/dashboard/page.tsx"]) {
    it(`${file} renders ErrorState with fixed copy`, () => {
      const src = read(file);
      assert.match(src, /<ErrorState/);
      assert.match(src, /onRetry=/);
      assert.match(src, /throwOnError: true/);
      assert.doesNotMatch(src, /error\.message|err\.message/);
    });
  }

  it("employer dashboard catches load failures", () => {
    assert.match(read("app/employer/dashboard/page.tsx"), /catch \{\n\s+if \(mounted\) setLoadFailed\(true\);/);
  });

  it("admin dashboard shows fixed copy, not the backend error text", () => {
    const src = read("app/admin/dashboard/_components/admin-dashboard-client.tsx");
    assert.match(src, /<ErrorState/);
    assert.doesNotMatch(src, />\{error\}</);
  });

  it("fetchers keep returning empty data by default", async () => {
    assert.deepEqual(await fetchEmployerApplicationsPreview(failing), []);
    assert.deepEqual((await fetchJobseekerDashboardData(failing)).applications, []);
    assert.equal((await fetchEmployerDashboardData(failing)).summary, null);
  });

  it("fetchers throw a generic error when asked to", async () => {
    for (const run of [
      () => fetchEmployerDashboardData(failing, { throwOnError: true }),
      () => fetchEmployerApplicationsPreview(failing, 6, { throwOnError: true }),
      () => fetchJobseekerDashboardData(failing, { throwOnError: true }),
    ]) {
      await assert.rejects(run, (err: Error) => !err.message.includes("synthetic failure detail"));
    }
  });
});
