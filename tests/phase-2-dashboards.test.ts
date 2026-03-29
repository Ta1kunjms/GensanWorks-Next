import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Phase 2 dashboard API smoke tests.
 *
 * These tests hit a running server. Set PHASE2_BASE_URL to enable:
 *   PHASE2_BASE_URL=http://localhost:3000 npm test
 */
const baseUrl = process.env.PHASE2_BASE_URL;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE2_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Phase 2 smoke server is unreachable");
  }
}

describe("phase-2 dashboard role access", () => {
  runOrSkip("GET /api/admin/summary rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/summary`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/jobs rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/jobs`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/employer/summary rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/employer/summary`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/jobseeker/jobs rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobseeker/jobs`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/jobseeker/applications rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobseeker/applications`);
    assert.equal(res.status, 401);
  });
});
