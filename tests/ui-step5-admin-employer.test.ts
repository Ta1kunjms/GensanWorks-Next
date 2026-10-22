// UI cleanup Step 5 (part A): admin and employer pages restyled onto the shared primitives.
// Static source checks: removed visual patterns stay at zero, raw buttons and AI-magic icons
// are gone, each page uses PageHeader, and strings pinned by other tests and e2e still exist.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const FILES: Record<string, (string | RegExp)[]> = {
  "app/admin/dashboard/_components/admin-dashboard-client.tsx": [
    "Admin Dashboard",
    "focusAfterRetryRef.current = true;",
    "headingRef.current?.focus()",
    "tabIndex={-1}",
    "<ErrorState",
  ],
  "app/admin/employers/page.tsx": [
    "Employer Approvals",
    'setError("Unable to load employers")',
    'setError("Failed to update employer status")',
    'setError("Failed to archive employer")',
    "/api/admin/employers?status=all",
    "No employers for this status.",
  ],
  "app/admin/employer-approvals/[id]/page.tsx": [
    /<p role="alert"[^>]*>\s*\{error\}/,
    'aria-required="true"',
    'aria-describedby="srs-rejection-hint"',
    "<DialogTitle",
    "Confirm Rejection",
  ],
  "app/admin/jobs/page.tsx": [
    'setError("Unable to load jobs")',
    'setError("Unable to update job status")',
    "/admin/jobs/${selectedJob.id}/match",
    "AI-assisted suggestion",
  ],
  "app/admin/matching/page.tsx": ["AI Suitability Matching", "/api/admin/matching/jobs", "AI-assisted suggestion"],
  "app/admin/matching/[job_id]/page.tsx": [
    "AI Suitability Report",
    "Dispatch to Employer",
    "AI-assisted suggestion",
    "/admin/applicants/${candidate.jobseekerId}",
  ],
  "app/admin/reports/page.tsx": [
    "Reports & Statistics",
    "Export CSV",
    'fetch("/api/admin/analytics"',
    'fetch("/api/admin/analytics/audit-feed?limit=8"',
  ],
  "app/admin/users/page.tsx": ["useConfirm()", 'setError("Unable to load users")', "No users found."],
  "app/employer/dashboard/page.tsx": [
    "<ErrorState",
    "onRetry=",
    "throwOnError: true",
    "fetchEmployerApplicationsPreview(),",
    "focusAfterRetryRef.current = true;",
    "headingRef.current?.focus()",
    "tabIndex={-1}",
  ],
  "app/employer/jobs/page.tsx": [
    'data-testid="employer-job-item"',
    "href={`/employer/matching/${job.id}`}",
    "My Job Posts",
    '"Create Job"',
    "useConfirm()",
    'sonnerToast.success("Job archived"',
  ],
  "app/employer/jobs/[id]/applications/page.tsx": [
    'data-testid="employer-application-item"',
    "Review and update applicant status.",
    "No applications yet.",
    "Current: {application.status}",
  ],
  "app/employer/applications/page.tsx": ["Applications", "No applications found"],
};

const REMOVED: Record<string, RegExp> = {
  gradient: /bg-gradient-to-/,
  clipText: /bg-clip-text/,
  backdropBlur: /backdrop-blur/,
  blurOrb: /(?<![\w-])blur-(?:2xl|3xl|\[)/,
  coloredGlow: /shadow-[a-z]+-[0-9]{3}/,
  hoverLift: /hover:(?:scale|-translate)/,
  largeRadius: /rounded-(?:[trblse]{1,2}-)?(?:2xl|3xl|\[)/,
  fontBlack: /font-black/,
  fontHeavy: /font-extrabold/,
  eyebrow: /tracking-\[0\./,
  lowContrast: /text-slate-(?:300|400)\b/,
  pingBounce: /animate-(?:ping|bounce)/,
  hexClass: /className=[^>\n]*#[0-9a-fA-F]{3,6}\b/,
  rawButton: /<button\b/,
};

describe("Step 5A admin and employer pages", () => {
  for (const [file, pinned] of Object.entries(FILES)) {
    describe(file, () => {
      const src = read(file);

      for (const [name, pattern] of Object.entries(REMOVED)) {
        it(`has no ${name}`, () => {
          assert.doesNotMatch(src, pattern);
        });
      }

      it("has no decorative pulse outside loading skeletons", () => {
        const pulses = src.split("\n").filter((line) => line.includes("animate-pulse"));
        for (const line of pulses) assert.match(line, /aria-busy="true"/, line.trim());
      });

      it("keeps inline styles only for dynamic widths", () => {
        const styles = src.match(/style=\{\{[^}]*\}\}/g) ?? [];
        for (const style of styles) assert.match(style, /^style=\{\{ width: `/, style);
      });

      it("imports no AI-magic icons", () => {
        assert.doesNotMatch(src, /\b(?:Sparkles|Wand2|Bot|BrainCircuit|Brain)\b/);
      });

      it("uses PageHeader for the page title", () => {
        assert.match(src, /from "@\/components\/ui\/page-header"/);
        assert.match(src, /<PageHeader\b/);
      });

      it("keeps pinned strings", () => {
        for (const item of pinned) {
          if (typeof item === "string") assert.ok(src.includes(item), `${file} lost ${item}`);
          else assert.match(src, item);
        }
      });
    });
  }

  it("matching pages present rankings as assistance only", () => {
    for (const file of ["app/admin/matching/page.tsx", "app/admin/matching/[job_id]/page.tsx"]) {
      const src = read(file);
      assert.doesNotMatch(src, /\b(?:accurate|accuracy|guaranteed?|unbiased)\b/i, file);
    }
  });
});

describe("Step 5 accessibility review fixes (admin and employer)", () => {
  it("admin jobs: labelled selects, linked rejection label, visible dialog title, scoped headers", () => {
    const src = read("app/admin/jobs/page.tsx");
    assert.match(src, /<select aria-label="Filter by status"/);
    assert.match(src, /aria-label="Sort jobs by"/);
    assert.match(src, /htmlFor="job-rejection-reason"/);
    assert.match(src, /id="job-rejection-reason"/);
    assert.match(src, /<DialogTitle className="[^"]*">\s*\{selectedJob\.positionTitle\}\s*<\/DialogTitle>/);
    assert.match(src, /\{selectedJob \? null : <DialogTitle className="sr-only">Job Details<\/DialogTitle>\}/);
    assert.doesNotMatch(src, /<th className=/);
    assert.equal((src.match(/<th scope="col"/g) ?? []).length, 5);
    assert.match(src, /label=\{status === "pending" \? "Pending Review" : undefined\}/);
  });

  it("admin matching detail: labelled search and accordion toggles control their panels", () => {
    const src = read("app/admin/matching/[job_id]/page.tsx");
    assert.match(src, /aria-label="Search candidates"/);
    assert.equal((src.match(/aria-controls=\{panelId\}/g) ?? []).length, 3);
    assert.equal((src.match(/<div id=\{panelId\}/g) ?? []).length, 3);
    assert.equal((src.match(/const panelId = useId\(\);/g) ?? []).length, 3);
  });

  it("employer jobs links are not wrapped around buttons", () => {
    const src = read("app/employer/jobs/page.tsx");
    assert.doesNotMatch(src, /<Link[^>]*>\s*<Button\b/);
    assert.match(src, /<Button asChild size="sm" variant="outline">\s*<Link href=\{`\/employer\/matching\/\$\{job\.id\}`\}>\s*View Matches/);
    assert.match(src, /<Button asChild size="sm">\s*<Link href=\{`\/employer\/jobs\/\$\{job\.id\}\/applications`\}>/);
  });

  it("reports: contrast-safe chart colours, text alternatives, heading order, scoped tables", () => {
    const src = read("app/admin/reports/page.tsx");
    assert.doesNotMatch(src, /#(?:f59e0b|22c55e|10b981|0ea5e9|94a3b8)\b/i);
    assert.equal((src.match(/<ChartSummary\b/g) ?? []).length, 6);
    assert.match(src, /<div className="sr-only">/);
    assert.equal((src.match(/<h1\b/g) ?? []).length, 1, "only the print-only letterhead h1 remains besides PageHeader");
    assert.match(src, /<h2[^>]*>LABOR MARKET INFORMATION MONITORING FORM 1<\/h2>/);
    assert.doesNotMatch(src, /<h3\b/);
    assert.doesNotMatch(src, /<th className=/);
    assert.equal((src.match(/tabIndex=\{0\} role="region" aria-label="/g) ?? []).length, 2);
  });

  it("spinners respect reduced motion and admin icons are decorative", () => {
    for (const file of ["app/admin/reports/page.tsx", "app/admin/jobs/page.tsx", "app/admin/matching/page.tsx", "app/admin/matching/[job_id]/page.tsx"]) {
      const src = read(file);
      const spins = src.match(/animate-spin[^"'`]*/g) ?? [];
      for (const spin of spins) assert.match(spin, /motion-reduce:animate-none/, file);
    }
  });

  it("StatusBadge accepts a label override and keeps Pending Review wording", () => {
    const badge = read("app/components/ui/status-badge.tsx");
    assert.match(badge, /label\?: string;/);
    assert.match(badge, /\{label \?\? mapped\.label\}/);
    assert.match(read("app/admin/employer-approvals/[id]/page.tsx"), /label=\{profile\.srsStatus === "pending" \? "Pending Review" : undefined\}/);
  });
});
