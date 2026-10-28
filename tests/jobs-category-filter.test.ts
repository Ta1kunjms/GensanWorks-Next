// Landing category cards link to /jobs?category=<slug>; the jobs page and
// /api/jobs must carry that filter through instead of silently ignoring it.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("jobs category filter", () => {
  it("/api/jobs validates the slug and filters jobs.category", () => {
    const route = read("app/api/jobs/route.ts");
    assert.match(route, /category: z\.string\(\)\.regex\(\/\^\[a-z0-9-\]\{1,60\}\$\/\)\.optional\(\)/);
    assert.match(route, /query\.ilike\("category", category\.replace\(\/-\/g, "_"\)\)/);
    assert.doesNotMatch(route, /details: result\.error\.message/);
  });

  it("jobs page reads ?category, sends it to the API and can clear it", () => {
    const page = read("app/jobseeker/jobs/page.tsx");
    assert.match(page, /searchParams\?\.get\("category"\)/);
    assert.match(page, /params\.append\("category", categoryFilter\)/);
    assert.match(page, /Clear category/);
  });

  it("landing category cards still link with the category slug", () => {
    assert.match(read("app/components/homepage/job-categories-section.tsx"), /\/jobs\?category=/);
  });
});
