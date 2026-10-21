// Offline checks for the 2026-10-22 navigation batch (docs/system-scan-2026-10-21.md, batch 6).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
const exists = (rel: string) => existsSync(path.join(process.cwd(), rel));

describe("broken links", () => {
  it("footer admin link points at the real admin login page", () => {
    assert.match(read("app/components/homepage/footer.tsx"), /href="\/login\/admin"/);
    assert.ok(exists("app/login/admin/page.tsx"));
  });

  it("employer matching back link targets an existing page", () => {
    assert.match(read("app/employer/matching/[job_id]/page.tsx"), /href=\{`\/employer\/jobs\/\$\{jobId\}\/applications`\}/);
    assert.ok(exists("app/employer/jobs/[id]/applications/page.tsx"));
  });

  it("jobseeker job page has no link to the missing public employer page", () => {
    assert.doesNotMatch(read("app/jobseeker/jobs/[id]/page.tsx"), /\/employers\/\$\{/);
  });

  it("admin layout redirects straight to the admin login", () => {
    assert.match(read("app/admin/layout.tsx"), /redirect\("\/login\/admin"\)/);
  });

  it("admin match list no longer claims candidates are de-identified", () => {
    assert.doesNotMatch(read("app/admin/jobs/[id]/match/page.tsx"), /De-identified/);
  });
});

describe("navigation entry points", () => {
  it("admins get a mobile header with the sidebar drawer", () => {
    const layout = read("app/admin/layout.tsx");
    assert.match(layout, /<MobileHeader user=\{user\} \/>/);
    assert.match(read("app/admin/mobile-header.tsx"), /<AdminSidebar user=\{user\} \/>/);
  });

  it("orphan pages are reachable from the sidebars", () => {
    const admin = read("app/components/admin-sidebar.tsx");
    assert.match(admin, /href: "\/admin\/access-requests"/);
    assert.match(admin, /href: "\/admin\/users"/);
    const jobseeker = read("app/components/jobseeker-sidebar.tsx");
    assert.match(jobseeker, /href: "\/jobseeker\/saved-jobs"/);
    assert.match(jobseeker, /href: "\/jobseeker\/referrals"/);
    assert.match(read("app/employer/jobs/page.tsx"), /href=\{`\/employer\/matching\/\$\{job\.id\}`\}/);
    for (const page of [
      "app/admin/access-requests/page.tsx",
      "app/admin/users/page.tsx",
      "app/jobseeker/saved-jobs/page.tsx",
      "app/jobseeker/referrals/page.tsx",
      "app/employer/matching/[job_id]/page.tsx",
    ]) {
      assert.ok(exists(page), page);
    }
  });
});
