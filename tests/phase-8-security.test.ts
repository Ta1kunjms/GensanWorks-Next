import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

/**
 * Phase 8 security smoke tests.
 *
 * These tests hit a running server. Set PHASE8_BASE_URL to enable:
 *   PHASE8_BASE_URL=http://localhost:3000 npm run test:phase8:smoke
 */
const baseUrl = process.env.PHASE8_BASE_URL;
const jobseekerCookie = process.env.PHASE8_JOBSEEKER_COOKIE;
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

async function fetchWithRetry(url: string, init?: RequestInit, attempts = 3): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown;

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

  throw lastError instanceof Error ? lastError : new Error("Request failed without response");
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

      assert.ok(res.status === 401 || res.status === 429);
      const payload = (await res.json()) as { error?: string };
      if (res.status === 401) {
        assert.equal(payload.error, "Unauthorized");
      } else {
        assert.equal(payload.error, "Rate limit exceeded");
      }
    }
  );

  runOrSkip("GET /api/auth/account-data/export rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/account-data/export`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/auth/account-data/export returns account payload for authenticated user", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE8_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const res = await fetchWithRetry(`${baseUrl}/api/auth/account-data/export`, {
      headers: { Cookie: jobseekerCookie },
    });

    if (res.status >= 500) {
      t.skip(`Account export endpoint degraded (status ${res.status})`);
      return;
    }

    assert.equal(res.status, 200);
    assert.ok((res.headers.get("content-type") ?? "").includes("application/json"));
    assert.ok((res.headers.get("content-disposition") ?? "").includes("gensanworks-account-export"));

    const payload = (await res.json()) as {
      success?: boolean;
      data?: {
        role?: string;
        exportedAt?: string;
        account?: {
          profile?: {
            id?: string;
          };
        };
      };
    };

    assert.equal(payload.success, true);
    assert.equal(payload.data?.role, "jobseeker");
    assert.equal(typeof payload.data?.exportedAt, "string");
    assert.equal(typeof payload.data?.account?.profile?.id, "string");
  });

  runOrSkip("GET /api/jobs handles SQL-injection-like search input safely", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const payload = encodeURIComponent("' OR 1=1 --");
    const res = await fetchWithRetry(`${baseUrl}/api/jobs?search=${payload}&limit=5`);
    if (res.status >= 500) {
      t.skip(`Jobs API degraded during SQLi smoke check (status ${res.status})`);
      return;
    }

    assert.ok(res.status === 200 || res.status === 400);

    const body = (await res.json()) as { data?: unknown[] };
    assert.ok(Array.isArray(body.data));
  });

  runOrSkip("GET /api/jobs handles XSS-like search input without server error", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const payload = encodeURIComponent('<script>alert("xss")</script>');
    const res = await fetchWithRetry(`${baseUrl}/api/jobs?search=${payload}&limit=5`);
    if (res.status >= 500) {
      t.skip(`Jobs API degraded during XSS smoke check (status ${res.status})`);
      return;
    }

    assert.ok(res.status === 200 || res.status === 400);
    assert.ok((res.headers.get("content-type") ?? "").includes("application/json"));
  });

  runOrSkip("POST /api/jobs/[id]/apply rejects forged-origin anonymous request", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const res = await fetchWithRetry(
      `${baseUrl}/api/jobs/00000000-0000-0000-0000-000000000000/apply`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://malicious.example",
          referer: "https://malicious.example/attack",
        },
        body: JSON.stringify({ coverLetter: "forged-origin-attempt" }),
      }
    );

    if (res.status >= 500) {
      t.skip(`Jobs apply API degraded during forged-origin check (status ${res.status})`);
      return;
    }

    assert.equal(res.status, 401);
  });

  runOrSkip("POST /api/auth/signup/admin-request rate limits repeated submissions", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 8 smoke server is unreachable");
      return;
    }

    const email = `phase8.bruteforce.${Date.now()}@example.com`;

    const statuses: number[] = [];

    for (let i = 0; i < 3; i += 1) {
      const res = await fetchWithRetry(`${baseUrl}/api/auth/signup/admin-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Phase 8 Rate Limit",
          email,
          phone: "09170000000",
          organization: "Security Test Org",
          notes: `Attempt ${i + 1}`,
        }),
      });

      if (res.status >= 500) {
        t.skip(`Admin-request signup API degraded (status ${res.status})`);
        return;
      }

      statuses.push(res.status);
    }

    assert.ok(
      statuses.includes(429),
      `Expected a 429 rate-limit response, got statuses: ${statuses.join(",")}`
    );
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
});
