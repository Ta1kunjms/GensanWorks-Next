// Static checks for the demo activity seed and its cleanup (not executed here;
// the owner runs them in the Supabase SQL editor after approval).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");

const seed = read("docs/seed/demo-activity-seed.sql");
const cleanup = read("docs/seed/demo-activity-cleanup.sql");

describe("demo activity seed", () => {
  it("runs in one transaction behind guards", () => {
    assert.match(seed, /^BEGIN;/m);
    assert.match(seed, /^COMMIT;/m);
    assert.match(seed, /Demo jobseekers not found/);
    assert.match(seed, /Demo activity already present/);
    assert.match(seed, /SELECT setseed\(/);
  });

  it("only uses demo jobseekers and demo employers' active jobs", () => {
    const seekers = seed.slice(seed.indexOf("CREATE TEMP TABLE _seekers"), seed.indexOf("CREATE TEMP TABLE _jobs"));
    assert.match(seekers, /email LIKE '%@demo\.gensanworks\.test'/);
    const jobs = seed.slice(seed.indexOf("CREATE TEMP TABLE _jobs"), seed.indexOf("CREATE TEMP TABLE _apps"));
    assert.match(jobs, /e\.email LIKE '%@demo\.gensanworks\.test' AND j\.job_status = 'active'/);
  });

  it("writes only canonical status values", () => {
    const appStatuses = [...seed.matchAll(/THEN '([a-z]+)'/g)].map((m) => m[1]);
    for (const s of appStatuses) {
      assert.ok(["pending", "reviewed", "shortlisted", "interview", "hired", "rejected", "withdrawn", "referred"].includes(s!), s);
    }
    assert.match(seed, /CASE ap\.status WHEN 'shortlisted' THEN 'referred' ELSE ap\.status END/);
    assert.match(seed, /WHERE ap\.status IN \('shortlisted', 'interview', 'hired', 'rejected'\)/);
  });

  it("marks slips as demo and never creates logins", () => {
    assert.match(seed, /'-DEMO' \|\| upper\(substr\(md5/);
    assert.doesNotMatch(seed, /auth\.users/);
    assert.doesNotMatch(seed, /\b(DELETE|TRUNCATE|DROP TABLE|UPDATE public)\b/);
  });
});

describe("demo activity cleanup", () => {
  it("deletes only demo activity rows", () => {
    assert.match(cleanup, /^BEGIN;/m);
    assert.match(cleanup, /^COMMIT;/m);
    const deletes = cleanup.match(/DELETE FROM [^;]+;/g) ?? [];
    assert.equal(deletes.length, 3);
    for (const stmt of deletes) {
      assert.match(stmt, /@demo\.gensanworks\.test/);
      assert.match(stmt, /^DELETE FROM public\.(referral_slips|referrals|applications)\n/);
    }
    assert.match(deletes[0]!, /slip_number LIKE 'RS-%-DEMO%'/);
  });
});
