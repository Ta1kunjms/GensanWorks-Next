import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.PHASE6_BASE_URL;
const adminCookie = process.env.PHASE6_ADMIN_COOKIE;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE6_BASE_URL is not set");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await fetch(baseUrl);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delay(1_000);
      }
    }
  }

  throw new Error(`Phase 6 smoke server is unreachable${lastError ? `: ${String(lastError)}` : ""}`);
}

describe("phase-6 admin analytics", () => {
  runOrSkip("GET /api/admin/analytics rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/analytics/timeline rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/timeline?months=6`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/analytics/export rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/export`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/analytics/export?format=excel rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/export?format=excel`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/analytics/referrals rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/referrals`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/analytics/audit-feed rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/audit-feed?limit=8`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/admin/analytics/timeline returns monthly trends for admin", async (t) => {
    if (!adminCookie) {
      t.skip("PHASE6_ADMIN_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/timeline?months=6`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      months?: number;
      monthlyTrends?: Array<{ month?: string; jobs?: number; applications?: number }>;
    };

    assert.equal(body.months, 6);
    assert.equal(Array.isArray(body.monthlyTrends), true);
  });

  runOrSkip("GET /api/admin/analytics/export returns csv for admin", async (t) => {
    if (!adminCookie) {
      t.skip("PHASE6_ADMIN_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/export`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
    assert.ok((res.headers.get("content-type") ?? "").includes("text/csv"));
    assert.ok((res.headers.get("content-disposition") ?? "").includes(".csv"));
  });

  runOrSkip("GET /api/admin/analytics/export?format=excel returns spreadsheet for admin", async (t) => {
    if (!adminCookie) {
      t.skip("PHASE6_ADMIN_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/export?format=excel`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
    assert.ok((res.headers.get("content-type") ?? "").includes("application/vnd.ms-excel"));
    assert.ok((res.headers.get("content-disposition") ?? "").includes(".xls"));

    const body = await res.text();
    assert.ok(body.includes("<Workbook"));
  });

  runOrSkip("GET /api/admin/analytics/referrals returns referral analytics for admin", async (t) => {
    if (!adminCookie) {
      t.skip("PHASE6_ADMIN_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/referrals`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      totalReferrals?: number;
      referralsByStatus?: unknown[];
      topEmployers?: unknown[];
    };
    assert.equal(typeof body.totalReferrals, "number");
    assert.equal(Array.isArray(body.referralsByStatus), true);
    assert.equal(Array.isArray(body.topEmployers), true);
  });

  runOrSkip("GET /api/admin/analytics/audit-feed returns activity events for admin", async (t) => {
    if (!adminCookie) {
      t.skip("PHASE6_ADMIN_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 6 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/analytics/audit-feed?limit=8`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      totalEvents?: number;
      events?: unknown[];
    };
    assert.equal(typeof body.totalEvents, "number");
    assert.equal(Array.isArray(body.events), true);
  });
});
