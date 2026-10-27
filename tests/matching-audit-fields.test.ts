// Auditability: every weighted scoring dimension (f1, f2, f3, f7, f8) and the
// pre-calibration utility must be persisted with each match score, so a
// stored score can be explained from its parts.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("persisted dimension_scores", () => {
  it("batch path stores f8 and the raw utility", () => {
    const src = read("app/lib/matching/persistence-engine.ts");
    const block = src.slice(src.indexOf("dimension_scores: res ? {"), src.indexOf("constraint_violations:"));
    for (const key of ["f1: res.f1", "f2: res.f2", "f3: res.f3", "f7: res.f7", "f8: res.f8", "raw_utility_score: res.utility_score"]) {
      assert.ok(block.includes(key), key);
    }
  });

  it("single-candidate path stores f8", () => {
    const src = read("app/lib/matching/agent.ts");
    const block = src.slice(src.indexOf("dimension_scores: {"), src.indexOf("f1_raw:"));
    assert.ok(block.includes("f8: scoringResult.f8"));
  });

  it("utility combines exactly the persisted weighted dimensions", () => {
    const src = read("app/lib/matching/scoring-engine.ts");
    const sum = src.slice(src.indexOf("const rawUtility ="), src.indexOf("let utility_score"));
    for (const key of ["f1.weighted", "f2Raw.weighted", "f3.weighted", "f7.weighted", "f8.weighted"]) {
      assert.ok(sum.includes(key), key);
    }
  });
});
