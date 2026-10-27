#!/usr/bin/env node
// Runs the signed-in Playwright e2e specs and saves a dated evidence file in
// docs/testing-evidence/. Usage: npm run test:e2e:evidence
//
// Needs (in .env.local or the shell): E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
// E2E_ADMIN_TOTP_SECRET, E2E_EMPLOYER_EMAIL, E2E_EMPLOYER_PASSWORD,
// E2E_JOBSEEKER_EMAIL, E2E_JOBSEEKER_PASSWORD. Optional: E2E_BASE_URL (default
// local dev server), E2E_ALLOW_MUTATIONS=1 to include specs that create data.
// Only E2E_* lines are read from .env.local; nothing else is loaded or printed.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const REQUIRED = [
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_ADMIN_TOTP_SECRET",
  "E2E_EMPLOYER_EMAIL",
  "E2E_EMPLOYER_PASSWORD",
  "E2E_JOBSEEKER_EMAIL",
  "E2E_JOBSEEKER_PASSWORD",
];
const SPECS = [
  "e2e/admin-mfa.spec.ts",
  "e2e/consent-gate.spec.ts",
  "e2e/jobseeker-workflow.spec.ts",
  "e2e/employer-workflow.spec.ts",
  "e2e/admin-workflow.spec.ts",
  "e2e/responsive-workflow.spec.ts",
];

export function parseE2eEnv(text) {
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(E2E_[A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return vars;
}

/** Removes ANSI codes and masks anything that looks like an email or a TOTP/secret value. */
export function scrubOutput(text, secrets = []) {
  let out = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "\n");
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join("[redacted]");
  }
  return out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
}

function main() {
  const envFile = path.join(root, ".env.local");
  const fileVars = existsSync(envFile) ? parseE2eEnv(readFileSync(envFile, "utf8")) : {};
  const env = { ...process.env, ...fileVars };

  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(`Missing: ${missing.join(", ")}. Add them to .env.local (never commit it).`);
    process.exit(2);
  }

  const started = new Date();
  const result = spawnSync("npx", ["playwright", "test", "--workers=1", "--reporter=line", ...SPECS], {
    cwd: root,
    env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const secrets = REQUIRED.map((key) => env[key]);
  const body = scrubOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, secrets)
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  const date = started.toISOString().slice(0, 10);
  const outDir = path.join(root, "docs", "testing-evidence");
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `e2e-signed-in-${date}.txt`);
  writeFileSync(
    outFile,
    [
      "# Signed-in e2e (Playwright, chromium, 1 worker)",
      `# Date: ${started.toISOString()}  Base URL: ${env.E2E_BASE_URL ?? "http://127.0.0.1:3000 (local dev server)"}`,
      `# Mutating specs: ${env.E2E_ALLOW_MUTATIONS === "1" ? "included" : "skipped"}  Exit code: ${result.status}`,
      `# Specs: ${SPECS.join(", ")}`,
      "# Emails and credentials are masked.",
      "",
      body,
      "",
    ].join("\n")
  );
  console.log(`Evidence saved: ${path.relative(root, outFile)} (exit ${result.status})`);
  process.exit(result.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  main();
}
