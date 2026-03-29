import assert from "node:assert/strict";
import { describe, it } from "node:test";

const baseUrl = process.env.PHASE2_BASE_URL;
const adminCookie = process.env.PHASE2_ADMIN_COOKIE;
const employerCookie = process.env.PHASE2_EMPLOYER_COOKIE;
const jobseekerCookie = process.env.PHASE2_JOBSEEKER_COOKIE;

const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE2_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Phase 2 metrics smoke server is unreachable");
  }
}

function hasNumericFields(payload: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof payload[key] === "number");
}

describe("phase-2 authenticated dashboard metrics", () => {
  runOrSkip("GET /api/admin/summary returns expected numeric metrics", async (t) => {
    if (!adminCookie) {
      t.skip("PHASE2_ADMIN_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 metrics smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/admin/summary`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(
      hasNumericFields(body, [
        "usersCount",
        "employersCount",
        "jobsCount",
        "applicationsCount",
        "pendingEmployerCount",
        "pendingAdminRequests",
        "pendingJobs",
      ]),
      true
    );
  });

  runOrSkip("GET /api/employer/summary returns expected metric envelope", async (t) => {
    if (!employerCookie) {
      t.skip("PHASE2_EMPLOYER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 metrics smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/employer/summary`, {
      headers: { Cookie: employerCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      success?: boolean;
      data?: Record<string, unknown>;
    };
    assert.equal(body.success, true);
    assert.equal(
      hasNumericFields(body.data ?? {}, [
        "jobsCount",
        "activeJobsCount",
        "applicationsCount",
        "pendingApplicationsCount",
      ]),
      true
    );
  });

  runOrSkip("GET /api/jobseeker/jobs returns jobs array for authenticated jobseeker", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE2_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 metrics smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobseeker/jobs?limit=3`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as { jobs?: unknown[] };
    assert.equal(Array.isArray(body.jobs), true);
  });

  runOrSkip("GET /api/jobseeker/applications returns applications array for authenticated jobseeker", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE2_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 metrics smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobseeker/applications`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as { applications?: unknown[] };
    assert.equal(Array.isArray(body.applications), true);
  });
});
