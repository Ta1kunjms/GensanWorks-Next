// The NSRP profile form saves "Other Skills" checkboxes as plain strings.
// Matching must read them (it previously dropped every string skill).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deidentifyJobseeker } from "../app/lib/matching/deidentify";

describe("deidentifyJobseeker other_skills", () => {
  it("keeps checkbox skills saved as strings and skips the Others placeholder", () => {
    const seeker = deidentifyJobseeker({
      id: "00000000-0000-4000-8000-000000000001",
      other_skills: ["Electrician", "Driver", "Others"],
      other_skills_others: "Industrial Wiring, Line Maintenance",
    } as never);
    const names = seeker.skills.map((s) => s.name);
    assert.ok(names.includes("Electrician"));
    assert.ok(names.includes("Driver"));
    assert.ok(names.includes("Industrial Wiring"));
    assert.ok(!names.includes("Others"));
  });

  it("still reads object-shaped skills from older rows", () => {
    const seeker = deidentifyJobseeker({
      id: "00000000-0000-4000-8000-000000000002",
      other_skills: [{ name: "Welding", proficiency_level: "Advanced" }],
    } as never);
    assert.deepEqual(seeker.skills.map((s) => s.name), ["Welding"]);
  });
});
