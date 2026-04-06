import { describe, it } from "node:test";
import assert from "node:assert/strict";

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

    const res = await fetch(`${baseUrl}/api/referrals`);
    assert.equal(res.status, 401);
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
  });
});
