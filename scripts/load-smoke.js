#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const baseUrl = process.env.LOAD_BASE_URL || "http://127.0.0.1:3000";
const totalRequests = Number(process.env.LOAD_TOTAL_REQUESTS || "60");
const concurrency = Number(process.env.LOAD_CONCURRENCY || "6");
const allowDegraded = process.env.LOAD_ALLOW_DEGRADED !== "0";
const targets = ["/", "/api/jobs?limit=5", "/api/admin/account-deletion/process"];
const reportPath = process.env.LOAD_REPORT_PATH || path.join(process.cwd(), "reports", "load", "load-smoke-report.json");

function nowMs() {
  return Number(process.hrtime.bigint() / BigInt(1e6));
}

function isExpectedStatus(target, status) {
  if (status === 429) {
    return true;
  }

  if (target.includes("account-deletion/process")) {
    return status === 401 || status === 429;
  }
  return status >= 200 && status < 300;
}

function isDegradedStatus(target, status) {
  if (status < 500 || status > 504) {
    return false;
  }

  return target === "/" || target.includes("/api/jobs");
}

async function hit(url, method = "GET") {
  const start = nowMs();
  const response = await fetch(url, method === "POST" ? { method } : undefined);
  return {
    ok: response.ok,
    status: response.status,
    ms: nowMs() - start,
  };
}

async function worker(iterations, stats) {
  for (let i = 0; i < iterations; i += 1) {
    for (const target of targets) {
      const method = target.includes("account-deletion/process") ? "POST" : "GET";
      try {
        const result = await hit(`${baseUrl}${target}`, method);
        stats.count += 1;
        stats.totalMs += result.ms;
        stats.maxMs = Math.max(stats.maxMs, result.ms);
        if (!isExpectedStatus(target, result.status)) {
          if (allowDegraded && isDegradedStatus(target, result.status)) {
            stats.degraded.push(`${target} -> ${result.status}`);
          } else {
            stats.failures.push(`${target} -> ${result.status}`);
          }
        }
      } catch (error) {
        stats.count += 1;
        stats.failures.push(`${target} -> network error`);
      }
    }
  }
}

async function main() {
  const iterationsPerWorker = Math.max(1, Math.floor(totalRequests / concurrency));
  const stats = { count: 0, totalMs: 0, maxMs: 0, failures: [], degraded: [] };

  const workers = Array.from({ length: concurrency }, () => worker(iterationsPerWorker, stats));
  await Promise.all(workers);

  const avgMs = stats.count === 0 ? 0 : Math.round(stats.totalMs / stats.count);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    targets,
    requestedTotal: totalRequests,
    concurrency,
    executedRequests: stats.count,
    averageMs: avgMs,
    maxMs: stats.maxMs,
    failureCount: stats.failures.length,
    failureSamples: stats.failures.slice(0, 50),
    degradedCount: stats.degraded.length,
    degradedSamples: stats.degraded.slice(0, 50),
    allowDegraded,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Load smoke complete: ${stats.count} requests, avg=${avgMs}ms, max=${stats.maxMs}ms`);
  console.log(`Load smoke report: ${reportPath}`);

  if (stats.degraded.length > 0) {
    console.log(`Degraded responses tolerated: ${stats.degraded.length}`);
    for (const degraded of stats.degraded.slice(0, 20)) {
      console.log(`~ ${degraded}`);
    }
  }

  if (stats.failures.length > 0) {
    console.error("Failures:");
    for (const f of stats.failures.slice(0, 20)) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
