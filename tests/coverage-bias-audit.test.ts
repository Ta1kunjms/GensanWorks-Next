// Offline tests for the matching bias auditor with an in-memory query stub
// (no Supabase calls). Group attributes are used only to audit score
// disparity, never as scoring inputs.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BiasAuditor, auditDemographicDisparity } from "../app/lib/matching/bias-audit";

type Result = { data: unknown; error: { message: string } | null };

function fakeDb(handlers: { scores?: Result; skills?: Result; jobs?: Result }): SupabaseClient {
  return {
    from(table: string) {
      let select = "";
      const builder = {
        select(cols: string) {
          select = cols;
          return builder;
        },
        eq: () => builder,
        not: () => builder,
        limit: () => builder,
        then(resolve: (r: Result) => unknown) {
          const empty: Result = { data: [], error: null };
          if (table === "jobs") return resolve(handlers.jobs ?? empty);
          return resolve((select.includes("other_skills") ? handlers.skills : handlers.scores) ?? empty);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

const row = (score: number, gender: string | null, age: number | null, city: string | null) => ({
  final_score: score,
  jobseekers: { gender, date_of_birth: age === null ? null : yearsAgo(age), logistics_zone: city },
});

describe("BiasAuditor.auditJob", () => {
  it("returns an insufficient-data report below 3 candidates", async () => {
    const report = await new BiasAuditor(fakeDb({ scores: { data: [row(80, "F", 30, "GSC")], error: null } })).auditJob("j1");
    assert.equal(report.passed, true);
    assert.equal(report.totalCandidates, 1);
    assert.match(report.summary, /Insufficient data/);
  });

  it("throws when the score query fails", async () => {
    await assert.rejects(
      new BiasAuditor(fakeDb({ scores: { data: null, error: { message: "boom" } } })).auditJob("j1"),
      /DB query failed — boom/
    );
  });

  it("passes when groups score alike", async () => {
    const data = [
      row(70, "F", 22, "GSC"), row(71, "M", 23, "GSC"), row(69, "F", 30, "GSC"),
      row(70, "M", 31, "GSC"), row(72, "F", 40, "GSC"), row(70, "M", 41, "GSC"),
    ];
    const report = await auditDemographicDisparity(fakeDb({ scores: { data, error: null } }), "j2");
    assert.equal(report.totalCandidates, 6);
    assert.equal(report.flags.length, 0);
    assert.equal(report.passed, true);
    assert.match(report.summary, /Audit passed/);
    assert.ok(report.records.some((r) => r.dimension === "age_bracket" && r.groupValue === "18-24"));
    assert.ok(report.records.some((r) => r.dimension === "education_level" && r.groupValue === "unknown"));
  });

  it("flags a large, significant disparity between groups", async () => {
    const data = [
      ...Array.from({ length: 8 }, (_, i) => row(90 + (i % 3), "M", 30, "GSC")),
      ...Array.from({ length: 8 }, (_, i) => row(40 + (i % 3), "F", 30, null)),
    ];
    const report = await new BiasAuditor(fakeDb({ scores: { data, error: null } })).auditJob("j3");
    const female = report.records.find((r) => r.dimension === "gender" && r.groupValue === "F");
    assert.ok(female);
    assert.equal(female.flagLevel, "high");
    assert.match(female.interpretation, /^HIGH: gender="F" scores .* below overall average/);
    assert.equal(report.passed, false);
    assert.match(report.summary, /high-level disparity flag/);
  });

  it("buckets ages and treats missing attributes as unknown", async () => {
    const data = [
      row(60, null, 16, null), row(61, null, 17, null),
      row(62, "F", 50, "GSC"), row(63, "F", 51, "GSC"),
      row(64, "M", 60, "GSC"), row(65, "M", 61, "GSC"),
      row(66, "M", null, "GSC"), row(67, "M", null, "GSC"),
    ];
    const report = await new BiasAuditor(fakeDb({ scores: { data, error: null } })).auditJob("j4");
    const brackets = report.records.filter((r) => r.dimension === "age_bracket").map((r) => r.groupValue).sort();
    assert.deepEqual(brackets, ["45-54", "55+", "under_18", "unknown"]);
    assert.ok(report.records.some((r) => r.dimension === "gender" && r.groupValue === "unknown"));
  });
});

describe("BiasAuditor.auditFormCompletionBias", () => {
  const skillRow = (score: number, skills: unknown) => ({ final_score: score, jobseekers: { other_skills: skills } });

  it("returns nothing with fewer than 5 rows or on error", async () => {
    assert.deepEqual(await new BiasAuditor(fakeDb({ skills: { data: [skillRow(1, [])], error: null } })).auditFormCompletionBias("j"), []);
    assert.deepEqual(await new BiasAuditor(fakeDb({ skills: { data: null, error: { message: "x" } } })).auditFormCompletionBias("j"), []);
  });

  it("flags a large score gap between low and high skill counts", async () => {
    const data = [
      skillRow(40, ["a"]), skillRow(42, "a,b"),
      skillRow(60, '["a","b","c"]'), skillRow(62, ["a", "b", "c", "d"]),
      skillRow(80, ["a", "b", "c", "d", "e", "f"]), skillRow(82, JSON.stringify(["a", "b", "c", "d", "e", "f", "g"])),
    ];
    const flags = await new BiasAuditor(fakeDb({ skills: { data, error: null } })).auditFormCompletionBias("j");
    assert.deepEqual(flags.map((f) => f.group), ["1-2 skills", "3-5 skills", "6+ skills"]);
    assert.equal(flags[0]!.flagLevel, "high");
    assert.equal(flags[2]!.flagLevel, "high");
    assert.equal(flags[1]!.flagLevel, "none");
  });

  it("surfaces form completion flags in the job report", async () => {
    const scores = Array.from({ length: 6 }, (_, i) => row(60 + i, i % 2 ? "M" : "F", 30, "GSC"));
    const skills = [
      skillRow(40, ["a"]), skillRow(41, ["a", "b"]),
      skillRow(80, ["a", "b", "c", "d", "e", "f"]), skillRow(81, ["a", "b", "c", "d", "e", "f"]),
      skillRow(60, "plain"),
    ];
    const report = await new BiasAuditor(fakeDb({ scores: { data: scores, error: null }, skills: { data: skills, error: null } })).auditJob("j5");
    assert.equal(report.passed, false);
    assert.match(report.summary, /form completion bias flag/);
  });
});

describe("BiasAuditor.auditAllJobs", () => {
  it("returns only reports with flags, most flags first", async () => {
    const data = [
      ...Array.from({ length: 8 }, (_, i) => row(90 + (i % 3), "M", 30, "GSC")),
      ...Array.from({ length: 8 }, (_, i) => row(40 + (i % 3), "F", 30, "GSC")),
    ];
    const reports = await new BiasAuditor(
      fakeDb({ jobs: { data: [{ id: "a" }, { id: "b" }], error: null }, scores: { data, error: null } })
    ).auditAllJobs();
    assert.equal(reports.length, 2);
    assert.ok(reports.every((r) => r.flags.length > 0));
  });

  it("returns an empty list when jobs cannot be read", async () => {
    assert.deepEqual(await new BiasAuditor(fakeDb({ jobs: { data: null, error: { message: "x" } } })).auditAllJobs(), []);
  });
});
