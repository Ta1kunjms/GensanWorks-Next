// UI hygiene ratchet for the 2026-10-22 UI cleanup (branch ui-cleanup, Step 1).
// Counts visual and interaction anti-patterns across app/**/*.{ts,tsx}. Counts must
// match BASELINE exactly: a higher count fails (do not add new ones), and a lower
// count also fails until BASELINE is lowered, so the ratchet only moves down.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const APP_DIR = path.join(process.cwd(), "app");

function listSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSources(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const PATTERNS = {
  gradient: /bg-gradient-to-/g,
  clipText: /bg-clip-text/g,
  backdropBlur: /backdrop-blur/g,
  // Decorative blur orbs; backdrop-blur is counted separately above.
  blurOrb: /(?<![\w-])blur-(?:2xl|3xl|\[)/g,
  coloredGlow: /shadow-[a-z]+-[0-9]{3}\//g,
  aiIcon: /\b(?:Sparkles|Wand2|Bot|BrainCircuit|Brain)\b/g,
  pingBounce: /animate-(?:ping|bounce)/g,
  // Includes side/corner variants such as rounded-t-2xl and rounded-tl-3xl.
  largeRadius: /rounded-(?:[trblse]{1,2}-)?(?:2xl|3xl|\[)/g,
  fontBlack: /font-black/g,
  fontHeavy: /font-extrabold/g,
  fontLight: /font-light/g,
  eyebrow: /tracking-\[0\./g,
  windowConfirm: /window\.confirm\(/g,
  windowAlert: /window\.alert\(/g,
  windowPrompt: /\bprompt\(/g,
  // Bare alert(), not foo.alert( and not part of an identifier.
  bareAlert: /(?<![\w.$])alert\(/g,
  rawButton: /<button\b/g,
  inlineStyle: /style=\{\{/g,
  lowContrast: /text-slate-(?:300|400)/g,
} satisfies Record<string, RegExp>;

// Exact counts measured on 2026-10-22 (after Step 4); lower them as cleanups land.
// 2026-10-23: counts rose because the owner restored the pre-cleanup landing design
// (app/page.tsx + app/components/homepage/*); the landing page keeps its gradients, glass
// panels and large radii by owner decision. Other surfaces still ratchet down.
const BASELINE: Record<keyof typeof PATTERNS, number> = {
  gradient: 66, // decorative gradients on marketing and dashboard surfaces; 41 -> 64 (owner restored pre-cleanup landing design 2026-10-23); 64 -> 66 (landing round 1 2026-10-27: Labour Market Snapshot hub, hero path cards and snapshot in the restored landing design)
  clipText: 20, // gradient text headings; 11 -> 19 (owner restored pre-cleanup landing design 2026-10-23); 19 -> 20 (landing round 1 2026-10-27: Labour Market Snapshot hub, hero path cards and snapshot in the restored landing design)
  backdropBlur: 31, // glass panels and overlays (dialog overlay and 3 modals cleaned); 22 -> 30 (owner restored pre-cleanup landing design 2026-10-23); 30 -> 31 (landing round 1 2026-10-27: Labour Market Snapshot hub, hero path cards and snapshot in the restored landing design)
  blurOrb: 31, // blurred background orbs; 14 -> 29 (owner restored pre-cleanup landing design 2026-10-23); 29 -> 31 (landing round 1 2026-10-27: Labour Market Snapshot hub, hero path cards and snapshot in the restored landing design)
  coloredGlow: 8, // colored shadow glows; 7 -> 8 (owner restored pre-cleanup landing design 2026-10-23)
  aiIcon: 8, // sparkle/robot/brain icons implying AI magic (1 is an icon name in api/services)
  pingBounce: 3, // attention-seeking motion
  largeRadius: 160, // radii above the 0.75rem card scale; 111 -> 153 (owner restored pre-cleanup landing design 2026-10-23); 153 -> 160 (landing round 1 2026-10-27: Labour Market Snapshot hub, hero path cards and snapshot in the restored landing design)
  fontBlack: 34, // 900 weight, no longer loaded (font trimmed to 400/500/700); 32 -> 34 (owner restored pre-cleanup landing design 2026-10-23)
  fontHeavy: 29, // 800 weight, no longer loaded; 20 -> 28 (owner restored pre-cleanup landing design 2026-10-23); 28 -> 29 (landing round 1 2026-10-27: Labour Market Snapshot hub, hero path cards and snapshot in the restored landing design)
  fontLight: 5, // 300 weight, no longer loaded; 3 -> 5 (owner restored pre-cleanup landing design 2026-10-23)
  eyebrow: 23, // uppercase wide-tracking eyebrows; 21 -> 23 (owner restored pre-cleanup landing design 2026-10-23)
  windowConfirm: 0, // native confirm dialogs; use useConfirm() (Step 3), keep at zero
  windowAlert: 0, // native alert via window, keep at zero
  windowPrompt: 0, // native prompt dialogs, keep at zero
  bareAlert: 0, // native alert dialogs; use sonner toasts (Step 3), keep at zero
  rawButton: 26, // raw <button> instead of the Button primitive; 28 -> 26 (landing restore 2026-10-23: dead video play buttons removed, FAQ trigger restored as a native button)
  inlineStyle: 37, // inline style objects (some are dynamic widths and stay); 31 -> 37 (owner restored pre-cleanup landing design 2026-10-23)
  lowContrast: 184, // slate-300/400 text below 4.5:1 on white; 183 -> 184 (owner restored pre-cleanup landing design 2026-10-23)
};

describe("UI hygiene ratchet (app/**/*.{ts,tsx})", () => {
  const files = listSources(APP_DIR);
  const sources = files.map((file) => readFileSync(file, "utf8"));

  it("scans the app directory", () => {
    assert.ok(files.length > 100, `expected many source files, found ${files.length}`);
  });

  for (const [name, pattern] of Object.entries(PATTERNS)) {
    it(`${name} count matches the ratchet`, () => {
      const count = sources.reduce((sum, src) => sum + (src.match(pattern) ?? []).length, 0);
      const baseline = BASELINE[name as keyof typeof PATTERNS];
      assert.ok(
        count <= baseline,
        `${name}: ${count} occurrences, baseline ${baseline}. Use the shared primitives instead of adding new ones.`
      );
      assert.ok(count >= baseline, `${name}: count dropped to ${count}; lower BASELINE.${name} to ${count}`);
    });
  }
});
