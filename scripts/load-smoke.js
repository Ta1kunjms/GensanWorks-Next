#!/usr/bin/env node

const baseUrl = process.env.LOAD_BASE_URL || "http://127.0.0.1:3000";
const totalRequests = Number(process.env.LOAD_TOTAL_REQUESTS || "60");
const concurrency = Number(process.env.LOAD_CONCURRENCY || "6");
const targets = ["/", "/api/jobs?limit=5", "/api/admin/account-deletion/process"];

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
          stats.failures.push(`${target} -> ${result.status}`);
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
  const stats = { count: 0, totalMs: 0, maxMs: 0, failures: [] };

  const workers = Array.from({ length: concurrency }, () => worker(iterationsPerWorker, stats));
  await Promise.all(workers);

  const avgMs = stats.count === 0 ? 0 : Math.round(stats.totalMs / stats.count);
  console.log(`Load smoke complete: ${stats.count} requests, avg=${avgMs}ms, max=${stats.maxMs}ms`);

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
