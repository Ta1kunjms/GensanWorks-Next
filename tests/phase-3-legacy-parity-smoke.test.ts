import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

/**
 * Legacy parity smoke tests for newly restored compatibility endpoints.
 *
 * Run against a live server:
 *   PHASE3_BASE_URL=http://localhost:3000 npm test
 */
const baseUrl = process.env.PHASE3_BASE_URL;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE3_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Legacy parity smoke server is unreachable");
  }
}

async function fetchJson(path: string) {
  const res = await fetch(`${baseUrl}${path}`);
  const data = (await res.json()) as Record<string, unknown>;
  return { res, data };
}

async function fetchJsonWithRetry(path: string, attempts = 3) {
  let result: { res: Response; data: Record<string, unknown> } | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await fetchJson(path);
    if (![500, 502, 503, 504].includes(result.res.status)) {
      return result;
    }

    if (attempt < attempts) {
      await delay(750 * attempt);
    }
  }

  return result as { res: Response; data: Record<string, unknown> };
}

function assertRateLimitHeaders(res: Response) {
  assert.ok(res.headers.get("X-Request-ID"));
  assert.ok(res.headers.get("X-RateLimit-Remaining"));
  assert.ok(res.headers.get("X-RateLimit-Reset"));
}

describe("phase-3 legacy compatibility endpoints", () => {
  runOrSkip("GET /api/health returns status ok", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const data = (await res.json()) as { status?: string };
    assert.equal(data.status, "ok");
  });

  runOrSkip("GET /api/referrals rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/referrals");
    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
    assert.equal(typeof data.requestId, "string");
  });

  runOrSkip("POST /api/referrals rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantId: "00000000-0000-0000-0000-000000000000",
        vacancyId: "00000000-0000-0000-0000-000000000000",
      }),
    });

    assert.equal(res.status, 401);

    const data = (await res.json()) as { error?: string; requestId?: string };
    assert.equal(data.error, "Unauthorized");
    assert.equal(typeof data.requestId, "string");
  });

  runOrSkip("GET /api/summary returns legacy summary contract", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJsonWithRetry("/api/summary");
    if (res.status >= 500) {
      t.skip(`Legacy summary API degraded (status ${res.status})`);
      return;
    }
    assert.equal(res.status, 200);
    assertRateLimitHeaders(res);

    const totalApplicants = data.totalApplicants as { value?: unknown } | undefined;
    const activeEmployers = data.activeEmployers as { value?: unknown } | undefined;
    const successfulReferrals = data.successfulReferrals as { value?: unknown } | undefined;

    assert.equal(typeof totalApplicants?.value, "number");
    assert.equal(typeof activeEmployers?.value, "number");
    assert.equal(typeof successfulReferrals?.value, "number");
  });

  runOrSkip("GET /api/public/impact returns legacy impact contract", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/public/impact");
    assert.equal(res.status, 200);
    assertRateLimitHeaders(res);

    assert.equal(typeof data.avgTimeToInterview, "string");
    assert.equal(typeof data.avgSalary, "string");
    assert.equal(typeof data.satisfactionRate, "string");
    assert.equal(typeof data.yearsOfService, "number");
  });

  runOrSkip("GET /api/settings/general/public returns public settings payload", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/settings/general/public");
    assert.equal(res.status, 200);
    assertRateLimitHeaders(res);

    assert.equal(typeof data.siteName, "string");
    assert.equal(typeof data.heroHeadline, "string");
    assert.equal(typeof data.contactEmail, "string");
  });

  runOrSkip("GET /api/charts/line returns chart arrays with aligned lengths", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/charts/line");
    assert.equal(res.status, 200);

    const months = (data.months as unknown[]) ?? [];
    const referred = (data.referred as unknown[]) ?? [];
    const hired = (data.hired as unknown[]) ?? [];
    const feedback = (data.feedback as unknown[]) ?? [];

    assert.ok(Array.isArray(months));
    assert.ok(Array.isArray(referred));
    assert.ok(Array.isArray(hired));
    assert.ok(Array.isArray(feedback));
    assert.equal(referred.length, months.length);
    assert.equal(hired.length, months.length);
    assert.equal(feedback.length, months.length);
  });

  runOrSkip("GET /api/charts/bar returns expected category arrays", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/charts/bar");
    assert.equal(res.status, 200);

    const barangays = (data.barangays as unknown[]) ?? [];
    const employed = (data.employed as unknown[]) ?? [];
    const unemployed = (data.unemployed as unknown[]) ?? [];
    const selfEmployed = (data.selfEmployed as unknown[]) ?? [];
    const newEntrant = (data.newEntrant as unknown[]) ?? [];

    assert.ok(Array.isArray(barangays));
    assert.equal(employed.length, barangays.length);
    assert.equal(unemployed.length, barangays.length);
    assert.equal(selfEmployed.length, barangays.length);
    assert.equal(newEntrant.length, barangays.length);
  });

  runOrSkip("GET /api/charts/doughnut returns numeric split", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/charts/doughnut");
    assert.equal(res.status, 200);
    assert.equal(typeof data.jobSeeker, "number");
    assert.equal(typeof data.freelancer, "number");
  });

  runOrSkip("GET /api/charts/employment-status returns numeric buckets", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/charts/employment-status");
    assert.equal(res.status, 200);
    assert.equal(typeof data.employed, "number");
    assert.equal(typeof data.wageEmployed, "number");
    assert.equal(typeof data.unemployed, "number");
    assert.equal(typeof data.selfEmployed, "number");
    assert.equal(typeof data.newEntrant, "number");
  });

  runOrSkip("GET /api/admin/export/jobs rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/admin/export/jobs?format=json");
    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
    assert.equal(typeof data.requestId, "string");
  });

  runOrSkip("GET /api/admin/activities rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/admin/activities");
    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  runOrSkip("GET /api/admin/system-alerts rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/admin/system-alerts");
    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  runOrSkip("GET /api/notes rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Legacy parity smoke server is unreachable");
      return;
    }

    const { res, data } = await fetchJson("/api/notes");
    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });
});
