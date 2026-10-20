// Offline unit tests for the LMI skills aggregation (SO5).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSkillTokens, summarizeSkills } from "../app/lib/lmi-skills";

describe("LMI skills — parseSkillTokens", () => {
  it("splits comma-separated text and trims blanks", () => {
    assert.deepEqual(parseSkillTokens(" Welding, , Driving ,Cooking"), ["Welding", "Driving", "Cooking"]);
  });

  it("reads string arrays and {name}/{skill} objects, ignoring other values", () => {
    assert.deepEqual(parseSkillTokens(["Excel", { name: "Sales" }, { skill: "Forklift" }, 3, null]), [
      "Excel",
      "Sales",
      "Forklift",
    ]);
  });

  it("returns nothing for empty or unsupported values", () => {
    assert.deepEqual(parseSkillTokens(null), []);
    assert.deepEqual(parseSkillTokens(42), []);
    assert.deepEqual(parseSkillTokens(""), []);
  });
});

describe("LMI skills — summarizeSkills", () => {
  const jobs = ["Welding, Driving", "welding", "Driving, Driving", "Customer Service", null];
  const seekers = ["Driving", "driving, Cooking", "Customer Service", ["Customer Service"]];

  it("ranks required skills by postings, case-insensitively, counting each posting once", () => {
    const { topRequired } = summarizeSkills(jobs, seekers);
    assert.deepEqual(
      topRequired.map((r) => [r.skill, r.demand, r.supply]),
      [
        ["Driving", 2, 2],
        ["Welding", 2, 0],
        ["Customer Service", 1, 2],
      ]
    );
  });

  it("lists only skills where demand exceeds supply, largest gap first", () => {
    const { gaps } = summarizeSkills(jobs, seekers);
    assert.deepEqual(gaps, [{ skill: "Welding", demand: 2, supply: 0, gap: 2 }]);
  });

  it("ranks supplied skills and respects the limit", () => {
    const { topSupplied } = summarizeSkills(jobs, seekers, 2);
    assert.deepEqual(topSupplied, [
      { skill: "Customer Service", count: 2 },
      { skill: "Driving", count: 2 },
    ]);
  });

  it("handles no data", () => {
    assert.deepEqual(summarizeSkills([], []), { topRequired: [], topSupplied: [], gaps: [] });
  });
});
