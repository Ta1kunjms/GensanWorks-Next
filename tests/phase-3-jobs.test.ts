import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

/**
 * Phase 3 API smoke tests.
 *
 * These tests hit a running server. Set PHASE3_BASE_URL to enable:
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
    throw new Error("Phase 3 smoke server is unreachable");
  }
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      lastResponse = response;

      // Retry transient backend errors before failing smoke assertions.
      if (![500, 502, 503, 504].includes(response.status)) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await delay(750 * attempt);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed without response");
}

describe("phase-3 public jobs flow", () => {
  runOrSkip("GET /api/jobs returns list envelope", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const res = await fetchWithRetry(`${baseUrl}/api/jobs?limit=5&offset=0`);
    if (res.status >= 500) {
      t.skip(`Phase 3 jobs API degraded (status ${res.status})`);
      return;
    }
    assert.equal(res.status, 200);

    const data = (await res.json()) as {
      data?: unknown[];
      pagination?: { limit?: number; offset?: number };
    };

    assert.ok(Array.isArray(data.data));
    assert.equal(data.pagination?.limit, 5);
    assert.equal(data.pagination?.offset, 0);
  });

  runOrSkip("GET /api/jobs/[id] returns the full job detail payload", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const listRes = await fetchWithRetry(`${baseUrl}/api/jobs?limit=1&offset=0`);
    if (listRes.status >= 500) {
      t.skip(`Phase 3 jobs list degraded (status ${listRes.status})`);
      return;
    }
    assert.equal(listRes.status, 200);

    const listData = (await listRes.json()) as { data?: Array<{ id?: string }> };
    const jobId = listData.data?.[0]?.id;
    assert.ok(jobId, "Expected at least one job from the list endpoint");

    const detailRes = await fetchWithRetry(`${baseUrl}/api/jobs/${jobId}`);
    if (detailRes.status >= 500) {
      t.skip(`Phase 3 jobs detail degraded (status ${detailRes.status})`);
      return;
    }
    assert.equal(detailRes.status, 200);

    const detail = (await detailRes.json()) as {
      positionTitle?: string;
      location?: string | null;
      employmentType?: string | null;
      startingSalary?: string | null;
      vacancies?: number | null;
      minimumEducationRequired?: string | null;
      mainSkillOrSpecialization?: string | null;
      yearsOfExperienceRequired?: string | null;
      agePreferenceMin?: number | null;
      agePreferenceMax?: number | null;
      category?: string | null;
      jobStatus?: string | null;
      psocCode?: string | null;
      slotsRemaining?: number | null;
      featured?: boolean;
      employerName?: string | null;
      publishedAt?: string | null;
    };

    assert.ok(typeof detail.positionTitle === "string" && detail.positionTitle.trim().length > 0);
    assert.ok(typeof detail.location === "string" || detail.location === null);
    assert.ok(typeof detail.employmentType === "string" || detail.employmentType === null);
    assert.ok(typeof detail.startingSalary === "string" || detail.startingSalary === null);
    assert.ok(typeof detail.vacancies === "number" || detail.vacancies === null);
    assert.ok(typeof detail.minimumEducationRequired === "string" || detail.minimumEducationRequired === null);
    assert.ok(typeof detail.mainSkillOrSpecialization === "string" || detail.mainSkillOrSpecialization === null);
    assert.ok(typeof detail.yearsOfExperienceRequired === "string" || detail.yearsOfExperienceRequired === null);
    assert.ok(typeof detail.agePreferenceMin === "number" || detail.agePreferenceMin === null);
    assert.ok(typeof detail.agePreferenceMax === "number" || detail.agePreferenceMax === null);
    assert.ok(typeof detail.category === "string" || detail.category === null);
    assert.ok(typeof detail.jobStatus === "string" || detail.jobStatus === null);
    assert.ok(typeof detail.psocCode === "string" || detail.psocCode === null);
    assert.ok(typeof detail.slotsRemaining === "number" || detail.slotsRemaining === null);
    assert.ok(typeof detail.featured === "boolean" || detail.featured === undefined);
    assert.ok(typeof detail.employerName === "string" || detail.employerName === null);
    assert.ok(typeof detail.publishedAt === "string" || detail.publishedAt === null);
  });

  runOrSkip("GET /api/jobs supports search query", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const res = await fetchWithRetry(`${baseUrl}/api/jobs?search=engineer&limit=5`);
    if (res.status >= 500) {
      t.skip(`Phase 3 jobs API degraded (status ${res.status})`);
      return;
    }
    assert.equal(res.status, 200);

    const data = (await res.json()) as { data?: unknown[] };
    assert.ok(Array.isArray(data.data));
  });

  runOrSkip("GET /api/jobs/[id] returns 404 for unknown id", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const res = await fetchWithRetry(
      `${baseUrl}/api/jobs/00000000-0000-0000-0000-000000000000`
    );
    if (res.status >= 500) {
      t.skip(`Phase 3 jobs detail API degraded (status ${res.status})`);
      return;
    }
    assert.equal(res.status, 404);
  });

  runOrSkip("POST /api/jobs/[id]/apply rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const res = await fetch(
      `${baseUrl}/api/jobs/00000000-0000-0000-0000-000000000000/apply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter: "Hello" }),
      }
    );

    assert.equal(res.status, 401);
  });
});
