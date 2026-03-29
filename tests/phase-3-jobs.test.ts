import { describe, it } from "node:test";
import assert from "node:assert/strict";

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

describe("phase-3 public jobs flow", () => {
  runOrSkip("GET /api/jobs returns list envelope", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobs?limit=5&offset=0`);
    assert.equal(res.status, 200);

    const data = (await res.json()) as {
      data?: unknown[];
      pagination?: { limit?: number; offset?: number };
    };

    assert.ok(Array.isArray(data.data));
    assert.equal(data.pagination?.limit, 5);
    assert.equal(data.pagination?.offset, 0);
  });

  runOrSkip("GET /api/jobs supports search query", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobs?search=engineer&limit=5`);
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

    const res = await fetch(
      `${baseUrl}/api/jobs/00000000-0000-0000-0000-000000000000`
    );
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
