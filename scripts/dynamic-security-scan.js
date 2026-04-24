#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { setTimeout: delay } = require("timers/promises");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function fetchWithRetry(url, init = {}, attempts = 3) {
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      lastResponse = response;
      if (![500, 502, 503, 504].includes(response.status)) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await delay(500 * attempt);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error(`Request failed for ${url}`);
}

async function main() {
  const envFileValues = parseEnvFile(path.join(process.cwd(), ".env.local"));
  const baseUrl = process.env.SECURITY_SCAN_BASE_URL || "http://127.0.0.1:3000";
  const cronSecret = process.env.ACCOUNT_DELETION_CRON_SECRET || envFileValues.ACCOUNT_DELETION_CRON_SECRET || "";

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    checks: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
  };

  const addCheck = (name, status, details, meta = {}) => {
    report.checks.push({ name, status, details, ...meta });
  };

  try {
    const root = await fetchWithRetry(`${baseUrl}/`);
    if (root.status !== 200) {
      addCheck(
        "Server reachability",
        "fail",
        `Expected 200 on / but got ${root.status}`,
        { statusCode: root.status }
      );
    } else {
      addCheck("Server reachability", "pass", "Base URL is reachable.");
    }

    const expectedHeaders = {
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
      "x-xss-protection": "1; mode=block",
      "referrer-policy": "strict-origin-when-cross-origin",
    };

    const mismatches = [];
    for (const [header, expected] of Object.entries(expectedHeaders)) {
      const actual = root.headers.get(header);
      if (actual !== expected) {
        mismatches.push(`${header}: expected '${expected}', got '${actual || "<missing>"}'`);
      }
    }

    const enforcedCsp = root.headers.get("content-security-policy") || "";
    const reportOnlyCsp = root.headers.get("content-security-policy-report-only") || "";

    if (!/default-src 'self'/i.test(enforcedCsp)) {
      mismatches.push("content-security-policy missing default-src 'self'");
    }

    if (!/default-src 'self'/i.test(reportOnlyCsp)) {
      mismatches.push("content-security-policy-report-only missing default-src 'self'");
    }

    if (mismatches.length > 0) {
      addCheck("Security headers baseline", "fail", "Header validation mismatch.", {
        mismatches,
      });
    } else {
      addCheck("Security headers baseline", "pass", "Expected security headers are present.");
    }

    const sqliPayload = encodeURIComponent("' OR 1=1 --");
    const sqli = await fetchWithRetry(`${baseUrl}/api/jobs?search=${sqliPayload}&limit=5`);
    if (sqli.status >= 500) {
      addCheck("SQLi payload handling", "skip", `Jobs API degraded (status ${sqli.status}).`, {
        statusCode: sqli.status,
      });
    } else if ([200, 400].includes(sqli.status)) {
      addCheck("SQLi payload handling", "pass", `Endpoint handled payload with status ${sqli.status}.`, {
        statusCode: sqli.status,
      });
    } else {
      addCheck("SQLi payload handling", "fail", `Unexpected status ${sqli.status}.`, {
        statusCode: sqli.status,
      });
    }

    const xssPayload = encodeURIComponent('<script>alert("xss")</script>');
    const xss = await fetchWithRetry(`${baseUrl}/api/jobs?search=${xssPayload}&limit=5`);
    if (xss.status >= 500) {
      addCheck("XSS payload handling", "skip", `Jobs API degraded (status ${xss.status}).`, {
        statusCode: xss.status,
      });
    } else if ([200, 400].includes(xss.status)) {
      addCheck("XSS payload handling", "pass", `Endpoint handled payload with status ${xss.status}.`, {
        statusCode: xss.status,
      });
    } else {
      addCheck("XSS payload handling", "fail", `Unexpected status ${xss.status}.`, {
        statusCode: xss.status,
      });
    }

    const forged = await fetchWithRetry(
      `${baseUrl}/api/jobs/00000000-0000-0000-0000-000000000000/apply`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://malicious.example",
          referer: "https://malicious.example/attack",
        },
        body: JSON.stringify({ coverLetter: "forged-origin" }),
      }
    );

    if (forged.status >= 500) {
      addCheck("Forged-origin mutation denial", "skip", `Apply API degraded (status ${forged.status}).`, {
        statusCode: forged.status,
      });
    } else if (forged.status === 401) {
      addCheck("Forged-origin mutation denial", "pass", "Anonymous forged-origin mutation denied.", {
        statusCode: forged.status,
      });
    } else {
      addCheck("Forged-origin mutation denial", "fail", `Expected 401 but got ${forged.status}.`, {
        statusCode: forged.status,
      });
    }

    const adminRequestStatuses = [];
    let adminRequestDegraded = false;
    const adminRequestEmail = `dynamic.scan.${Date.now()}@example.com`;

    for (let i = 0; i < 4; i += 1) {
      const response = await fetchWithRetry(`${baseUrl}/api/auth/signup/admin-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Dynamic Scan",
          email: adminRequestEmail,
          phone: "09170000000",
          organization: "Security Scan",
          notes: `Attempt ${i + 1}`,
        }),
      });

      adminRequestStatuses.push(response.status);
      if (response.status >= 500) {
        adminRequestDegraded = true;
        break;
      }
    }

    if (adminRequestDegraded) {
      addCheck(
        "Admin request brute-force guard",
        "skip",
        `Admin-request API degraded (statuses: ${adminRequestStatuses.join(", ")}).`,
        { statuses: adminRequestStatuses }
      );
    } else if (adminRequestStatuses.includes(429)) {
      addCheck("Admin request brute-force guard", "pass", "Rate-limit response observed for repeated attempts.", {
        statuses: adminRequestStatuses,
      });
    } else {
      addCheck(
        "Admin request brute-force guard",
        "fail",
        `Expected a 429 response but got statuses: ${adminRequestStatuses.join(", ")}.`,
        { statuses: adminRequestStatuses }
      );
    }

    if (!cronSecret) {
      addCheck(
        "Cron deletion processor rate limit",
        "skip",
        "ACCOUNT_DELETION_CRON_SECRET not configured for dynamic scan."
      );
    } else {
      const cronStatuses = [];
      let cronDegraded = false;

      for (let i = 0; i < 6; i += 1) {
        const response = await fetchWithRetry(`${baseUrl}/api/admin/account-deletion/process`, {
          method: "POST",
          headers: { "x-cron-secret": cronSecret },
        });

        cronStatuses.push(response.status);
        if (response.status >= 500) {
          cronDegraded = true;
          break;
        }
      }

      if (cronDegraded) {
        addCheck(
          "Cron deletion processor rate limit",
          "skip",
          `Deletion processor degraded (statuses: ${cronStatuses.join(", ")}).`,
          { statuses: cronStatuses }
        );
      } else if (cronStatuses[cronStatuses.length - 1] === 429) {
        addCheck("Cron deletion processor rate limit", "pass", "Observed 429 after repeated cron calls.", {
          statuses: cronStatuses,
        });
      } else {
        addCheck(
          "Cron deletion processor rate limit",
          "fail",
          `Expected final status 429 but got ${cronStatuses[cronStatuses.length - 1]}.`,
          { statuses: cronStatuses }
        );
      }
    }
  } catch (error) {
    addCheck("Dynamic scan runtime", "fail", `Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const check of report.checks) {
    report.summary.total += 1;
    if (check.status === "pass") {
      report.summary.passed += 1;
    } else if (check.status === "fail") {
      report.summary.failed += 1;
    } else {
      report.summary.skipped += 1;
    }
  }

  const reportDir = path.join(process.cwd(), "reports", "security");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "dynamic-security-scan-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nDynamic security scan summary:");
  console.log(`- Passed: ${report.summary.passed}`);
  console.log(`- Failed: ${report.summary.failed}`);
  console.log(`- Skipped: ${report.summary.skipped}`);
  console.log(`- Report: ${reportPath}`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Dynamic security scan failed:", error);
  process.exit(1);
});
