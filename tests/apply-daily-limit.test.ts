// The 10-applications-per-day cap must not rely only on the in-memory limiter
// (per server instance on Vercel); the apply route also counts the jobseeker's
// applications submitted in the last 24 hours in the database.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(path.join(process.cwd(), "app/api/jobs/[id]/apply/route.ts"), "utf8");

describe("apply route daily cap", () => {
  it("keeps the per-instance limiter", () => {
    assert.match(src, /key: `apply:\$\{session\.user\.id\}:daily`/);
    assert.match(src, /maxRequests: 10,/);
  });

  it("counts the jobseeker's own applications from the last 24 hours before inserting", () => {
    const countAt = src.indexOf('.select("id", { count: "exact", head: true })');
    const insertAt = src.indexOf(".insert({");
    assert.ok(countAt > 0 && countAt < insertAt, "count query must run before the insert");
    const block = src.slice(countAt, insertAt);
    assert.match(block, /\.eq\("jobseeker_id", session\.user\.id!\)/);
    assert.match(block, /\.gte\("submitted_at", new Date\(Date\.now\(\) - 86400000\)\.toISOString\(\)\)/);
    assert.match(block, /if \(recentResult\.error\) throw recentResult\.error;/);
    assert.match(block, />= 10\)[\s\S]*status: 429/);
  });
});
