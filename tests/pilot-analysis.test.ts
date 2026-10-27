// Pilot analysis tool on synthetic data (no real respondents).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  alphaLabel,
  analyzeSurvey,
  analyzeTasks,
  compareBaseline,
  cronbachAlpha,
  mean,
  median,
  parseCsv,
  runFolder,
  sd,
} from "../scripts/pilot-analysis";

const close = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("statistics", () => {
  it("computes mean, sample SD and median", () => {
    close(mean([1, 2, 3, 4]), 2.5);
    close(sd([2, 4, 4, 4, 5, 5, 7, 9]), 2.138);
    assert.ok(Number.isNaN(sd([3])));
    assert.equal(median([5, 1, 3]), 3);
    assert.equal(median([4, 1, 3, 2]), 2.5);
  });

  it("computes Cronbach's alpha and drops incomplete rows", () => {
    // Highly consistent items, so alpha is close to 1.
    const m = [
      [1, 1, 1],
      [2, 2, 1],
      [3, 3, 3],
      [4, 3, 4],
      [5, 5, 5],
    ];
    const a = cronbachAlpha(m);
    assert.equal(a.n, 5);
    assert.ok(a.alpha > 0.95 && a.alpha <= 1, String(a.alpha));
    assert.equal(cronbachAlpha([[1, 2], [3, null]]).n, 1);
    assert.ok(Number.isNaN(cronbachAlpha([[3, 3], [3, 3]]).alpha), "zero variance");
    assert.equal(alphaLabel(0.85), "Good");
    assert.equal(alphaLabel(0.65), "Questionable");
    assert.equal(alphaLabel(NaN), "not computable");
  });
});

describe("survey, tasks and baseline", () => {
  const survey = parseCsv(
    [
      "respondent_code,group,PU1,PU2,PEOU1,PEOU2",
      "JS-01,JS,5,4,4,4",
      "JS-02,JS,4,4,5,5",
      "EM-01,EM,3,4,4,",
      'PS-01,PS,5,5,"4",3',
    ].join("\n")
  );

  it("reports constructs per group and pooled, with the 4.00 threshold", () => {
    const r = analyzeSurvey(survey);
    assert.deepEqual(r.profile.JS, { n: 2, pct: 50 });
    const pooledPU = r.constructs.find((c) => c.group === "POOLED" && c.construct === "PU")!;
    assert.equal(pooledPU.n, 4);
    close(pooledPU.mean, (4.5 + 4 + 3.5 + 5) / 4);
    assert.equal(pooledPU.meetsThreshold, true);
    const emPEOU = r.constructs.find((c) => c.group === "EM" && c.construct === "PEOU")!;
    assert.equal(emPEOU.mean, 4, "blank answer ignored");
    assert.equal(r.items.find((i) => i.item === "PEOU2")!.n, 3);
  });

  it("summarizes tasks: completion %, time of completed attempts, errors", () => {
    const t = analyzeTasks(
      parseCsv(
        ["respondent_code,group,task_id,completed,seconds,errors", "JS-01,JS,J4,1,60,0", "JS-02,JS,J4,yes,90,1", "JS-03,JS,J4,0,300,3"].join("\n")
      )
    );
    assert.equal(t.length, 1);
    close(t[0]!.completionRate, 66.667);
    assert.equal(t[0]!.meanSeconds, 75);
    close(t[0]!.meanErrors, 4 / 3);
  });

  it("compares the baseline midpoint with the post-pilot median", () => {
    const res = compareBaseline(
      parseCsv(["indicator,baseline_low,baseline_high,unit", "Vacancy posting time,20,40,minutes", "Onboarding completion,,,%"].join("\n")),
      parseCsv(["indicator,value", "Vacancy posting time,10", "Vacancy posting time,14", "Vacancy posting time,12", "Onboarding completion,80"].join("\n"))
    );
    const v = res.find((r) => r.indicator === "Vacancy posting time")!;
    assert.equal(v.baseline, 30);
    assert.equal(v.postPilotMedian, 12);
    assert.equal(v.difference, -18);
    close(v.pctChange!, -60);
    const o = res.find((r) => r.indicator === "Onboarding completion")!;
    assert.equal(o.baseline, null);
    assert.equal(o.pctChange, null);
  });

  it("writes markdown and JSON from a folder of CSVs", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pilot-"));
    writeFileSync(path.join(dir, "survey.csv"), "respondent_code,group,PU1,PU2\nJS-01,JS,5,4\nJS-02,JS,4,4\n");
    runFolder(dir);
    const md = readFileSync(path.join(dir, "pilot-results.md"), "utf8");
    assert.match(md, /## Constructs/);
    assert.match(md, /\| POOLED \| PU \| 2 \| 2 \| 4\.25 \|/);
    assert.ok(JSON.parse(readFileSync(path.join(dir, "pilot-results.json"), "utf8")).survey);
  });
});
