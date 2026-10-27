// Pilot analysis (manuscript §3.10.7): descriptive statistics only, no
// inferential tests. Usage:
//   npm run pilot:analyze -- <folder>
// The folder holds (any may be missing):
//   survey.csv        respondent_code,group,PU1,PU2,...,PEOU1,...   (1-5 Likert; blank = no answer)
//   tasks.csv         respondent_code,group,task_id,completed,seconds,errors
//   baseline.csv      indicator,baseline_low,baseline_high,unit
//   observations.csv  indicator,value                                (one row per post-pilot observation)
// Output: <folder>/pilot-results.md and <folder>/pilot-results.json.
// Construct = the item id without its trailing number (PU3 -> PU). Use
// respondent codes only (e.g. JS-07); no names or emails.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ACCEPTANCE_THRESHOLD = 4.0;

export type Row = Record<string, string>;

export function parseCsv(text: string): Row[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const split = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };
  const header = split(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? NaN : xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Sample standard deviation (n - 1). */
export function sd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function variance(xs: number[]): number {
  const s = sd(xs);
  return s * s;
}

/**
 * Cronbach's alpha over complete cases: alpha = k/(k-1) * (1 - sum(var_i) / var_total).
 * `matrix` is respondents x items. Respondents with any missing item are dropped.
 */
export function cronbachAlpha(matrix: Array<Array<number | null>>): { alpha: number; n: number; k: number } {
  const complete = matrix.filter((row) => row.every((v) => typeof v === "number" && Number.isFinite(v))) as number[][];
  const k = complete[0]?.length ?? 0;
  if (complete.length < 2 || k < 2) return { alpha: NaN, n: complete.length, k };
  const itemVars = Array.from({ length: k }, (_, j) => variance(complete.map((r) => r[j]!)));
  const totalVar = variance(complete.map((r) => r.reduce((s, v) => s + v, 0)));
  if (totalVar === 0) return { alpha: NaN, n: complete.length, k };
  const alpha = (k / (k - 1)) * (1 - itemVars.reduce((s, v) => s + v, 0) / totalVar);
  return { alpha, n: complete.length, k };
}

/** George & Mallery (2003) labels. */
export function alphaLabel(alpha: number): string {
  if (!Number.isFinite(alpha)) return "not computable";
  if (alpha >= 0.9) return "Excellent";
  if (alpha >= 0.8) return "Good";
  if (alpha >= 0.7) return "Acceptable";
  if (alpha >= 0.6) return "Questionable";
  if (alpha >= 0.5) return "Poor";
  return "Unacceptable";
}

const constructOf = (item: string) => item.replace(/\d+$/, "");
const META = new Set(["respondent_code", "group"]);

export type ConstructResult = {
  construct: string;
  group: string;
  items: string[];
  n: number;
  mean: number;
  sd: number;
  meetsThreshold: boolean;
  alpha: number;
  alphaN: number;
  alphaLabel: string;
};

export function analyzeSurvey(rows: Row[]): { constructs: ConstructResult[]; items: Array<{ item: string; n: number; mean: number; sd: number }>; profile: Record<string, { n: number; pct: number }> } {
  const items = Object.keys(rows[0] ?? {}).filter((h) => !META.has(h));
  const value = (row: Row, item: string): number | null => {
    const v = Number(row[item]);
    return row[item] !== "" && Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
  };

  const groups = [...new Set(rows.map((r) => r.group || "ALL"))].sort();
  const profile: Record<string, { n: number; pct: number }> = {};
  for (const g of groups) {
    const n = rows.filter((r) => (r.group || "ALL") === g).length;
    profile[g] = { n, pct: rows.length ? (n / rows.length) * 100 : 0 };
  }

  const itemStats = items.map((item) => {
    const xs = rows.map((r) => value(r, item)).filter((v): v is number => v !== null);
    return { item, n: xs.length, mean: mean(xs), sd: sd(xs) };
  });

  const constructs: ConstructResult[] = [];
  const constructNames = [...new Set(items.map(constructOf))];
  for (const group of ["POOLED", ...groups]) {
    const subset = group === "POOLED" ? rows : rows.filter((r) => (r.group || "ALL") === group);
    for (const construct of constructNames) {
      const cItems = items.filter((i) => constructOf(i) === construct);
      // Construct score per respondent = mean of the items they answered.
      const scores = subset
        .map((r) => cItems.map((i) => value(r, i)).filter((v): v is number => v !== null))
        .filter((xs) => xs.length > 0)
        .map(mean);
      const a = cronbachAlpha(subset.map((r) => cItems.map((i) => value(r, i))));
      const m = mean(scores);
      constructs.push({
        construct,
        group,
        items: cItems,
        n: scores.length,
        mean: m,
        sd: sd(scores),
        meetsThreshold: Number.isFinite(m) && m >= ACCEPTANCE_THRESHOLD,
        alpha: a.alpha,
        alphaN: a.n,
        alphaLabel: alphaLabel(a.alpha),
      });
    }
  }
  return { constructs, items: itemStats, profile };
}

export type TaskResult = { group: string; task_id: string; attempted: number; completionRate: number; meanSeconds: number; meanErrors: number };

export function analyzeTasks(rows: Row[]): TaskResult[] {
  const keys = [...new Set(rows.map((r) => `${r.group}\u0000${r.task_id}`))].sort();
  return keys.map((key) => {
    const [group, task_id] = key.split("\u0000") as [string, string];
    const rs = rows.filter((r) => r.group === group && r.task_id === task_id);
    const completed = rs.filter((r) => ["1", "yes", "true", "y"].includes(r.completed.toLowerCase()));
    const seconds = completed.map((r) => Number(r.seconds)).filter(Number.isFinite);
    const errors = rs.map((r) => Number(r.errors)).filter(Number.isFinite);
    return {
      group,
      task_id,
      attempted: rs.length,
      completionRate: rs.length ? (completed.length / rs.length) * 100 : NaN,
      meanSeconds: mean(seconds),
      meanErrors: mean(errors),
    };
  });
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export type BaselineResult = { indicator: string; unit: string; baseline: number | null; postPilotMedian: number; n: number; difference: number | null; pctChange: number | null };

/** Baseline = midpoint of the staff-reported range; post-pilot = median of observations. */
export function compareBaseline(baseline: Row[], observations: Row[]): BaselineResult[] {
  const indicators = [...new Set([...baseline.map((b) => b.indicator), ...observations.map((o) => o.indicator)])];
  return indicators.map((indicator) => {
    const b = baseline.find((x) => x.indicator === indicator);
    const lo = Number(b?.baseline_low);
    const hi = Number(b?.baseline_high);
    const base = b && b.baseline_low !== "" && b.baseline_high !== "" && Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : null;
    const obs = observations.filter((o) => o.indicator === indicator).map((o) => Number(o.value)).filter(Number.isFinite);
    const post = median(obs);
    const diff = base !== null && Number.isFinite(post) ? post - base : null;
    return {
      indicator,
      unit: b?.unit ?? "",
      baseline: base,
      postPilotMedian: post,
      n: obs.length,
      difference: diff,
      pctChange: diff !== null && base ? (diff / base) * 100 : null,
    };
  });
}

const f = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? "—" : x.toFixed(d));

export function renderMarkdown(results: {
  survey?: ReturnType<typeof analyzeSurvey>;
  tasks?: TaskResult[];
  baseline?: BaselineResult[];
}): string {
  const out: string[] = ["# Pilot results (descriptive)", "", `Acceptance threshold: PU and PEOU mean ≥ ${ACCEPTANCE_THRESHOLD.toFixed(2)}.`, ""];
  if (results.survey) {
    out.push("## Respondent profile", "", "| Group | f | % |", "|---|---|---|");
    for (const [g, p] of Object.entries(results.survey.profile)) out.push(`| ${g} | ${p.n} | ${f(p.pct, 1)} |`);
    out.push("", "## Constructs", "", "| Group | Construct | Items | n | Mean | SD | ≥ 4.00 | Cronbach's α (n) | Interpretation |", "|---|---|---|---|---|---|---|---|---|");
    for (const c of results.survey.constructs) {
      out.push(`| ${c.group} | ${c.construct} | ${c.items.length} | ${c.n} | ${f(c.mean)} | ${f(c.sd)} | ${c.meetsThreshold ? "yes" : "no"} | ${f(c.alpha, 3)} (${c.alphaN}) | ${c.alphaLabel} |`);
    }
    out.push("", "## Items", "", "| Item | n | Mean | SD |", "|---|---|---|---|");
    for (const i of results.survey.items) out.push(`| ${i.item} | ${i.n} | ${f(i.mean)} | ${f(i.sd)} |`);
    out.push("");
  }
  if (results.tasks) {
    out.push("## Task-based usability", "", "| Group | Task | Attempted | Completion % | Mean time (s, completed) | Mean errors |", "|---|---|---|---|---|---|");
    for (const t of results.tasks) out.push(`| ${t.group} | ${t.task_id} | ${t.attempted} | ${f(t.completionRate, 1)} | ${f(t.meanSeconds, 1)} | ${f(t.meanErrors)} |`);
    out.push("");
  }
  if (results.baseline) {
    out.push("## Table 44 indicators (baseline midpoint vs post-pilot median)", "", "| Indicator | Unit | Baseline | Post-pilot median | n | Difference | % change |", "|---|---|---|---|---|---|---|");
    for (const b of results.baseline) out.push(`| ${b.indicator} | ${b.unit} | ${f(b.baseline)} | ${f(b.postPilotMedian)} | ${b.n} | ${f(b.difference)} | ${f(b.pctChange, 1)} |`);
    out.push("", "Indicators without a numeric baseline are reported as post-pilot values only.", "");
  }
  return out.join("\n");
}

export function runFolder(folder: string) {
  const load = (name: string) => {
    const file = path.join(folder, name);
    return existsSync(file) ? parseCsv(readFileSync(file, "utf8")) : null;
  };
  const surveyRows = load("survey.csv");
  const taskRows = load("tasks.csv");
  const baselineRows = load("baseline.csv");
  const observationRows = load("observations.csv");
  const results = {
    survey: surveyRows ? analyzeSurvey(surveyRows) : undefined,
    tasks: taskRows ? analyzeTasks(taskRows) : undefined,
    baseline: baselineRows || observationRows ? compareBaseline(baselineRows ?? [], observationRows ?? []) : undefined,
  };
  writeFileSync(path.join(folder, "pilot-results.md"), renderMarkdown(results));
  writeFileSync(path.join(folder, "pilot-results.json"), JSON.stringify(results, null, 2));
  return results;
}

const invokedDirectly = process.argv[1] && /pilot-analysis\.ts$/.test(process.argv[1]);
if (invokedDirectly) {
  const folder = process.argv[2];
  if (!folder || !existsSync(folder)) {
    console.error("Usage: npm run pilot:analyze -- <folder with survey.csv / tasks.csv / baseline.csv / observations.csv>");
    process.exit(2);
  }
  runFolder(folder);
  console.log(`Wrote ${path.join(folder, "pilot-results.md")} and pilot-results.json`);
}
