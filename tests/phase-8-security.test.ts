import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Phase 8 security smoke tests.
 *
 * These tests hit a running server. Set PHASE8_BASE_URL to enable:
 *   PHASE8_BASE_URL=http://localhost:3000 npm run test:phase8:smoke
 */
const baseUrl = process.env.PHASE8_BASE_URL;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE8_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Phase 8 smoke server is unreachable");
  }
}

describe("phase-8 security hardening", () => {
  runOrSkip("GET / returns baseline security headers", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(res.headers.get("x-xss-protection"), "1; mode=block");
    assert.equal(
      res.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin"
    );
    assert.equal(
      res.headers.get("permissions-policy"),
      "camera=(), microphone=(), geolocation=()"
    );
    assert.equal(res.headers.get("cross-origin-opener-policy"), "same-origin");
    assert.equal(res.headers.get("cross-origin-resource-policy"), "same-site");
    assert.equal(res.headers.get("x-dns-prefetch-control"), "off");
    assert.equal(res.headers.get("x-permitted-cross-domain-policies"), "none");
    const csp = res.headers.get("content-security-policy") ?? "";
    const cspReportOnly = res.headers.get("content-security-policy-report-only") ?? "";
    assert.match(csp, /default-src 'self'/i);
    assert.match(csp, /object-src 'none'/i);
    assert.match(cspReportOnly, /default-src 'self'/i);
    assert.match(cspReportOnly, /object-src 'none'/i);
    const hsts = res.headers.get("strict-transport-security") ?? "";
    assert.match(hsts, /max-age=31536000/i);
  });

  runOrSkip("POST /api/admin/account-deletion/process rate limits repeated cron calls", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const cronSecret = process.env.ACCOUNT_DELETION_CRON_SECRET;
    if (!cronSecret) {
      t.skip("ACCOUNT_DELETION_CRON_SECRET is not configured");
      return;
    }

    let lastResponse: Response | null = null;
    for (let index = 0; index < 6; index += 1) {
      lastResponse = await fetch(`${baseUrl}/api/admin/account-deletion/process`, {
        method: "POST",
        headers: { "x-cron-secret": cronSecret },
      });
    }

    assert.ok(lastResponse);
    assert.equal(lastResponse?.status, 429);
    const payload = (await lastResponse!.json()) as { error?: string; retryAfterSeconds?: number };
    assert.equal(payload.error, "Rate limit exceeded");
    assert.equal(typeof payload.retryAfterSeconds, "number");
  });

  runOrSkip(
    "POST /api/admin/account-deletion/process rejects anonymous caller",
    async (t) => {
      try {
        await ensureServerReachable();
      } catch {
        t.skip("Phase 8 smoke server is unreachable");
        return;
      }

      const res = await fetch(`${baseUrl}/api/admin/account-deletion/process`, {
        method: "POST",
      });

      assert.equal(res.status, 401);
      const payload = (await res.json()) as { error?: string };
      assert.equal(payload.error, "Unauthorized");
    }
  );
});
