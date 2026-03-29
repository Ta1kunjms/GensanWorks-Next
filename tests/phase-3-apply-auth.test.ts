import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Phase 3 authenticated apply smoke tests.
 *
 * Run with a live dev server and seeded/authenticated session cookies:
 *   PHASE3_BASE_URL=http://localhost:3000 \
 *   PHASE3_ACTIVE_JOB_ID=<job-id> \
 *   PHASE3_JOBSEEKER_COOKIE='next-auth.session-token=...' \
 *   PHASE3_EMPLOYER_COOKIE='next-auth.session-token=...' \
 *   npm run test:phase3:apply:auth
 */

const baseUrl = process.env.PHASE3_BASE_URL;
const activeJobId = process.env.PHASE3_ACTIVE_JOB_ID;
const jobseekerCookie = process.env.PHASE3_JOBSEEKER_COOKIE;
const employerCookie = process.env.PHASE3_EMPLOYER_COOKIE;

const hasCoreEnv = Boolean(baseUrl && activeJobId);
const runOrSkip = hasCoreEnv ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE3_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Phase 3 auth smoke server is unreachable");
  }
}

async function postApply(cookieHeader: string): Promise<Response> {
  return fetch(`${baseUrl}/api/jobs/${activeJobId}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ coverLetter: "Phase 3 authenticated smoke test" }),
  });
}

describe("phase-3 authenticated apply flow", () => {
  runOrSkip("POST /api/jobs/[id]/apply rejects non-jobseeker session", async (t) => {
    if (!employerCookie) {
      t.skip("PHASE3_EMPLOYER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 auth smoke server is unreachable");
      return;
    }

    const res = await postApply(employerCookie);
    assert.equal(res.status, 403);
  });

  runOrSkip("POST /api/jobs/[id]/apply enforces duplicate-apply guard", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE3_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 3 auth smoke server is unreachable");
      return;
    }

    const first = await postApply(jobseekerCookie);
    // First run may already be a duplicate from previous test data.
    assert.ok(first.status === 200 || first.status === 400);

    const second = await postApply(jobseekerCookie);
    assert.equal(second.status, 400);
  });
});
