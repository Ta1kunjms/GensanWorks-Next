#!/usr/bin/env node
/*
  Runs seeded local validation suites with deterministic credentials.

  Default behavior:
  - Runs Phase 2 smoke suites
  - Runs Phase 3 smoke suites (including authenticated apply)
  - Seeds admin/employer/jobseeker passwords from database
  - Resolves authenticated cookies for jobseeker/employer/admin
  - Runs Phase 4 authenticated smoke tests
  - Runs Phase 5 authenticated smoke tests
  - Runs Phase 6 authenticated smoke tests
  - Runs Phase 7 core Playwright suite
  - Runs Phase 7 mutation Playwright suite when E2E_ALLOW_MUTATIONS=1 (default)
  - Runs Phase 8 smoke suite

  Optional env overrides:
  - SEED_BASE_URL (default: http://localhost:3000)
  - E2E_ALLOW_MUTATIONS (default: 1)
  - RUN_PHASE2=0 to skip Phase 2 suites
  - RUN_PHASE3=0 to skip Phase 3 suites
  - RUN_PHASE7=0 to skip Phase 7 suites
  - RUN_PHASE8=0 to skip Phase 8 smoke suite
  - SEED_STRICT_NO_SKIPS=1 to fail when critical suites report skipped tests
  - SEED_REPORT_PATH=<path> to override report output path
*/

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const npmCmd = "npm";
const baseUrl = process.env.SEED_BASE_URL || "http://localhost:3000";
const allowMutations = process.env.E2E_ALLOW_MUTATIONS || "1";
const runPhase2 = process.env.RUN_PHASE2 !== "0";
const runPhase3 = process.env.RUN_PHASE3 !== "0";
const runPhase7 = process.env.RUN_PHASE7 !== "0";
const runPhase8 = process.env.RUN_PHASE8 !== "0";
const allowAuthCookieDegraded = process.env.SEED_ALLOW_AUTH_COOKIE_DEGRADED !== "0";
const strictNoSkips = process.env.SEED_STRICT_NO_SKIPS === "1";
const seededReportPath =
  process.env.SEED_REPORT_PATH ||
  path.join(projectRoot, "reports", "validation", "seeded-validation-report.json");

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  strictNoSkips,
  config: {
    runPhase2,
    runPhase3,
    runPhase7,
    runPhase8,
    allowMutations,
    allowAuthCookieDegraded,
  },
  suites: [],
};

function logStep(message) {
  console.log(`\n==> ${message}`);
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...(options.env || {}),
    },
    encoding: "utf8",
    stdio: options.captureOutput ? ["inherit", "pipe", "pipe"] : "inherit",
    shell: options.shell === true,
  });

  if (result.error) {
    throw new Error(`Command failed to start: ${command} ${args.join(" ")}\n${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = options.captureOutput
      ? `\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`
      : "";
    const statusText = result.status === null ? "null" : String(result.status);
    throw new Error(`Command failed: ${command} ${args.join(" ")} (exit ${statusText})${details}`);
  }

  return result;
}

function getLastNumericMatch(regex, text) {
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) {
    return null;
  }

  const last = matches[matches.length - 1];
  const value = Number(last[1]);
  return Number.isFinite(value) ? value : null;
}

function parseTestSummary(output) {
  const normalized = output || "";

  const tapPass = getLastNumericMatch(/#\s*pass(?:ed)?\s+(\d+)/gi, normalized);
  const tapFail = getLastNumericMatch(/#\s*fail(?:ed)?\s+(\d+)/gi, normalized);
  const tapSkipped = getLastNumericMatch(/#\s*skipped\s+(\d+)/gi, normalized);

  if (tapPass !== null || tapFail !== null || tapSkipped !== null) {
    return {
      source: "tap",
      passed: tapPass,
      failed: tapFail,
      skipped: tapSkipped,
    };
  }

  const nodePass = getLastNumericMatch(/[\u2139i]\s+pass(?:ed)?\s+(\d+)/gi, normalized);
  const nodeFail = getLastNumericMatch(/[\u2139i]\s+fail(?:ed)?\s+(\d+)/gi, normalized);
  const nodeSkipped = getLastNumericMatch(/[\u2139i]\s+skipped\s+(\d+)/gi, normalized);

  if (nodePass !== null || nodeFail !== null || nodeSkipped !== null) {
    return {
      source: "node",
      passed: nodePass,
      failed: nodeFail,
      skipped: nodeSkipped,
    };
  }

  const playwrightPassed = getLastNumericMatch(/(\d+)\s+passed/gi, normalized);
  const playwrightFailed = getLastNumericMatch(/(\d+)\s+failed/gi, normalized);
  const playwrightSkipped = getLastNumericMatch(/(\d+)\s+skipped/gi, normalized);

  if (playwrightPassed !== null || playwrightFailed !== null || playwrightSkipped !== null) {
    return {
      source: "playwright",
      passed: playwrightPassed,
      failed: playwrightFailed,
      skipped: playwrightSkipped,
    };
  }

  return {
    source: "unparsed",
    passed: null,
    failed: null,
    skipped: null,
  };
}

function addSuiteReport(label, scriptName, summary) {
  report.suites.push({
    label,
    script: scriptName,
    summary,
  });
}

function runNodeScript(scriptRelativePath, env) {
  const scriptPath = path.join(projectRoot, scriptRelativePath);
  const result = execute(process.execPath, [scriptPath], {
    captureOutput: true,
    env,
  });
  return (result.stdout || "").trim();
}

function getCookie({ email, password, role }) {
  return runNodeScript(path.join("scripts", "get-auth-cookie.js"), {
    BASE_URL: baseUrl,
    AUTH_EMAIL: email,
    AUTH_PASSWORD: password,
    AUTH_ROLE: role,
  });
}

function tryGetCookie({ email, password, role, label }) {
  try {
    return getCookie({ email, password, role });
  } catch (error) {
    if (!allowAuthCookieDegraded) {
      throw error;
    }

    console.warn(
      `Warning: could not resolve ${label} cookie. Continuing in degraded mode (authenticated checks may be skipped).`
    );
    if (error instanceof Error && error.message) {
      console.warn(error.message);
    }
    return "";
  }
}

function runNpmScript(scriptName, env = {}) {
  const result = execute(npmCmd, ["run", scriptName], {
    env,
    shell: process.platform === "win32",
    captureOutput: true,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return parseTestSummary(`${result.stdout || ""}\n${result.stderr || ""}`);
}

function runSuite(scriptName, label, env) {
  const summary = runNpmScript(scriptName, env);
  addSuiteReport(label, scriptName, summary);

  if (strictNoSkips) {
    if (summary.skipped === null) {
      throw new Error(
        `Strict no-skip mode enabled but skipped count could not be parsed for ${label} (${scriptName}).`
      );
    }

    if (summary.skipped > 0) {
      throw new Error(
        `Strict no-skip mode violation: ${label} (${scriptName}) reported ${summary.skipped} skipped test(s).`
      );
    }
  }

  return summary;
}

function writeSeededValidationReport() {
  const totals = {
    passed: 0,
    failed: 0,
    skipped: 0,
    suites: report.suites.length,
  };

  for (const suite of report.suites) {
    totals.passed += suite.summary.passed || 0;
    totals.failed += suite.summary.failed || 0;
    totals.skipped += suite.summary.skipped || 0;
  }

  const payload = {
    ...report,
    totals,
  };

  fs.mkdirSync(path.dirname(seededReportPath), { recursive: true });
  fs.writeFileSync(seededReportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\nSeeded validation report: ${seededReportPath}`);
}

function parseSeedPayload(payload) {
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error(`Failed to parse set-test-passwords output as JSON.\nOutput:\n${payload}`);
  }
}

function requireSeedField(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required seeded value: ${label}`);
  }
  return value;
}

function main() {
  logStep("Seeding deterministic role passwords");
  const seedPayload = runNodeScript(path.join("scripts", "set-test-passwords.js"));
  const seeded = parseSeedPayload(seedPayload);

  const adminEmail = requireSeedField(seeded?.admin?.email, "admin.email");
  const employerEmail = requireSeedField(seeded?.employer?.email, "employer.email");
  const jobseekerEmail = requireSeedField(seeded?.jobseeker?.email, "jobseeker.email");

  const adminPassword = requireSeedField(seeded?.passwords?.admin, "passwords.admin");
  const employerPassword = requireSeedField(seeded?.passwords?.employer, "passwords.employer");
  const jobseekerPassword = requireSeedField(seeded?.passwords?.jobseeker, "passwords.jobseeker");

  logStep("Resolving authenticated fixture cookies");
  const jobseekerCookie = tryGetCookie({
    email: jobseekerEmail,
    password: jobseekerPassword,
    role: "jobseeker",
    label: "jobseeker",
  });
  const adminCookie = tryGetCookie({
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    label: "admin",
  });
  const employerCookie = tryGetCookie({
    email: employerEmail,
    password: employerPassword,
    role: "employer",
    label: "employer",
  });

  let activeJobId = process.env.PHASE3_ACTIVE_JOB_ID || "";
  if (runPhase3 && !activeJobId) {
    try {
      activeJobId = runNodeScript(path.join("scripts", "get-active-job-id.js"), {
        DATABASE_URL: process.env.DATABASE_URL || "",
      });
      if (activeJobId) {
        console.log(`Resolved PHASE3_ACTIVE_JOB_ID: ${activeJobId}`);
      }
    } catch (error) {
      if (strictNoSkips) {
        throw error;
      }
      console.warn("Warning: could not resolve PHASE3_ACTIVE_JOB_ID. Phase 3 apply smoke may skip.");
      if (error instanceof Error && error.message) {
        console.warn(error.message);
      }
    }
  }

  if (runPhase2) {
    logStep("Running Phase 2 smoke suites");
    const phase2Env = {
      PHASE2_BASE_URL: baseUrl,
      PHASE2_ADMIN_COOKIE: adminCookie,
      PHASE2_EMPLOYER_COOKIE: employerCookie,
      PHASE2_JOBSEEKER_COOKIE: jobseekerCookie,
    };
    runSuite("test:phase2:smoke", "Phase 2 dashboards smoke", phase2Env);
    runSuite("test:phase2:pages", "Phase 2 dashboard pages smoke", phase2Env);
    runSuite("test:phase2:metrics:auth", "Phase 2 metrics auth smoke", phase2Env);
  } else {
    console.log("Skipping Phase 2 suites because RUN_PHASE2=0.");
  }

  if (runPhase3) {
    logStep("Running Phase 3 smoke suites");
    runSuite("test:phase3:smoke", "Phase 3 jobs smoke", {
      PHASE3_BASE_URL: baseUrl,
    });

    runSuite("test:phase3:apply:auth", "Phase 3 authenticated apply smoke", {
      PHASE3_BASE_URL: baseUrl,
      PHASE3_ACTIVE_JOB_ID: activeJobId,
      PHASE3_JOBSEEKER_COOKIE: jobseekerCookie,
      PHASE3_EMPLOYER_COOKIE: employerCookie,
    });
  } else {
    console.log("Skipping Phase 3 suites because RUN_PHASE3=0.");
  }

  logStep("Running Phase 4 authenticated smoke suite");
  runSuite("test:phase4:smoke", "Phase 4 employer smoke", {
    PHASE4_BASE_URL: baseUrl,
    PHASE4_EMPLOYER_COOKIE: employerCookie,
    PHASE4_JOBSEEKER_COOKIE: jobseekerCookie,
  });

  logStep("Running Phase 5 authenticated smoke suite");
  runSuite("test:phase5:smoke", "Phase 5 messaging smoke", {
    PHASE5_BASE_URL: baseUrl,
    PHASE5_JOBSEEKER_COOKIE: jobseekerCookie,
  });

  logStep("Running Phase 6 authenticated smoke suite");
  runSuite("test:phase6:smoke", "Phase 6 admin analytics smoke", {
    PHASE6_BASE_URL: baseUrl,
    PHASE6_ADMIN_COOKIE: adminCookie,
  });

  if (runPhase7) {
    const e2eEnv = {
      E2E_BASE_URL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
      E2E_ADMIN_EMAIL: adminEmail,
      E2E_ADMIN_PASSWORD: adminPassword,
      E2E_EMPLOYER_EMAIL: employerEmail,
      E2E_EMPLOYER_PASSWORD: employerPassword,
      E2E_JOBSEEKER_EMAIL: jobseekerEmail,
      E2E_JOBSEEKER_PASSWORD: jobseekerPassword,
      E2E_ALLOW_MUTATIONS: allowMutations,
      E2E_EMPLOYER_SECOND_EMAIL: process.env.E2E_EMPLOYER_SECOND_EMAIL || "",
      E2E_EMPLOYER_SECOND_PASSWORD: process.env.E2E_EMPLOYER_SECOND_PASSWORD || "",
    };

    logStep("Running Phase 7 core suite");
    runSuite("test:e2e:phase7", "Phase 7 core Playwright", e2eEnv);

    logStep("Running Phase 7 responsive suite");
    runSuite("test:e2e:responsive", "Phase 7 responsive Playwright", e2eEnv);

    if (allowMutations === "1") {
      logStep("Running Phase 7 mutation suite");
      runSuite("test:e2e:phase7:mutations", "Phase 7 mutation Playwright", e2eEnv);
    } else {
      console.log("Skipping Phase 7 mutation suite because E2E_ALLOW_MUTATIONS is not 1.");
    }
  } else {
    console.log("Skipping Phase 7 suites because RUN_PHASE7=0.");
  }

  if (runPhase8) {
    if (strictNoSkips && !process.env.ACCOUNT_DELETION_CRON_SECRET) {
      throw new Error(
        "Strict no-skip mode requires ACCOUNT_DELETION_CRON_SECRET so Phase 8 cron guard checks do not skip."
      );
    }

    logStep("Running Phase 8 smoke suite");
    runSuite("test:phase8:smoke", "Phase 8 security smoke", {
      PHASE8_BASE_URL: baseUrl,
      PHASE8_JOBSEEKER_COOKIE: jobseekerCookie,
      ACCOUNT_DELETION_CRON_SECRET: process.env.ACCOUNT_DELETION_CRON_SECRET || "",
    });
  } else {
    console.log("Skipping Phase 8 suite because RUN_PHASE8=0.");
  }

  writeSeededValidationReport();

  console.log("\nSeeded validation completed successfully.");
}

try {
  main();
} catch (error) {
  console.error("\nSeeded validation failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
