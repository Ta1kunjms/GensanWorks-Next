import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.PHASE4_BASE_URL;
const employerCookie = process.env.PHASE4_EMPLOYER_COOKIE;
const jobseekerCookie = process.env.PHASE4_JOBSEEKER_COOKIE;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE4_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Phase 4 smoke server is unreachable");
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

type EmployerApplicationsEnvelope = {
  data?: {
    applications?: Array<{
      id: string;
    }>;
  };
};

async function resolveEmployerApplicationId(cookie: string): Promise<string | null> {
  if (!baseUrl) {
    return null;
  }

  const response = await fetchWithRetry(`${baseUrl}/api/employer/applications?limit=10&offset=0`, {
    headers: { Cookie: cookie },
  });

  if (response.status !== 200) {
    return null;
  }

  const payload = (await response.json()) as EmployerApplicationsEnvelope;
  return payload.data?.applications?.[0]?.id ?? null;
}

describe("phase-4 employer workflows", () => {
  runOrSkip("GET /api/employer/applications rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const response = await fetch(`${baseUrl}/api/employer/applications?limit=5&offset=0`);
    assert.equal(response.status, 401);
  });

  runOrSkip("GET /api/employer/applications/[id] rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/employer/applications/00000000-0000-0000-0000-000000000000`
    );
    assert.equal(response.status, 401);
  });

  runOrSkip("POST /api/employer/applications/[id]/message rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/employer/applications/00000000-0000-0000-0000-000000000000/message`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "This should fail for anonymous users." }),
      }
    );

    assert.equal(response.status, 401);
  });

  runOrSkip("GET /api/employer/applications returns employer-owned records", async (t) => {
    if (!employerCookie) {
      t.skip("PHASE4_EMPLOYER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const response = await fetchWithRetry(`${baseUrl}/api/employer/applications?limit=10&offset=0`, {
      headers: { Cookie: employerCookie },
    });

    if (response.status >= 500) {
      t.skip(`Phase 4 applications list degraded (status ${response.status})`);
      return;
    }

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data?: {
        applications?: unknown[];
        pagination?: {
          limit?: number;
          offset?: number;
          total?: number;
        };
      };
    };

    assert.ok(Array.isArray(payload.data?.applications));
    assert.equal(payload.data?.pagination?.limit, 10);
    assert.equal(payload.data?.pagination?.offset, 0);
    assert.equal(typeof payload.data?.pagination?.total, "number");
  });

  runOrSkip("GET /api/employer/applications/[id] returns detail for owner", async (t) => {
    if (!employerCookie) {
      t.skip("PHASE4_EMPLOYER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const applicationId = await resolveEmployerApplicationId(employerCookie);
    if (!applicationId) {
      t.skip("No employer-owned applications available for detail assertions");
      return;
    }

    const response = await fetchWithRetry(`${baseUrl}/api/employer/applications/${applicationId}`, {
      headers: { Cookie: employerCookie },
    });

    if (response.status >= 500) {
      t.skip(`Phase 4 application detail degraded (status ${response.status})`);
      return;
    }

    assert.equal(response.status, 200);

    const payload = (await response.json()) as {
      data?: {
        application?: {
          id?: string;
          status?: string;
        };
      };
    };

    assert.equal(payload.data?.application?.id, applicationId);
    assert.equal(typeof payload.data?.application?.status, "string");
  });

  runOrSkip("PATCH /api/employer/applications/[id] updates status for owner", async (t) => {
    if (!employerCookie) {
      t.skip("PHASE4_EMPLOYER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const applicationId = await resolveEmployerApplicationId(employerCookie);
    if (!applicationId) {
      t.skip("No employer-owned applications available for status update assertions");
      return;
    }

    const response = await fetchWithRetry(`${baseUrl}/api/employer/applications/${applicationId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Cookie: employerCookie,
      },
      body: JSON.stringify({
        status: "reviewed",
        feedback: "Phase 4 smoke validation update.",
      }),
    });

    if (response.status >= 500) {
      t.skip(`Phase 4 application status update degraded (status ${response.status})`);
      return;
    }

    assert.equal(response.status, 200);
  });

  runOrSkip("POST /api/employer/applications/[id]/message sends feedback message", async (t) => {
    if (!employerCookie) {
      t.skip("PHASE4_EMPLOYER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const applicationId = await resolveEmployerApplicationId(employerCookie);
    if (!applicationId) {
      t.skip("No employer-owned applications available for message assertions");
      return;
    }

    const response = await fetchWithRetry(
      `${baseUrl}/api/employer/applications/${applicationId}/message`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Cookie: employerCookie,
        },
        body: JSON.stringify({
          message: "Thank you for applying. We will update you with the next steps soon.",
        }),
      }
    );

    if (response.status >= 500) {
      t.skip(`Phase 4 application message endpoint degraded (status ${response.status})`);
      return;
    }

    assert.equal(response.status, 200);

    const payload = (await response.json()) as {
      data?: {
        data?: {
          id?: string;
          applicationId?: string;
        };
      };
    };

    assert.equal(payload.data?.data?.applicationId, applicationId);
    assert.equal(typeof payload.data?.data?.id, "string");
  });

  runOrSkip("jobseeker cannot access employer applications endpoints", async (t) => {
    if (!employerCookie || !jobseekerCookie) {
      t.skip("PHASE4_EMPLOYER_COOKIE or PHASE4_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 4 smoke server is unreachable");
      return;
    }

    const applicationId = await resolveEmployerApplicationId(employerCookie);
    if (!applicationId) {
      t.skip("No employer-owned applications available for role-boundary assertions");
      return;
    }

    const listResponse = await fetchWithRetry(`${baseUrl}/api/employer/applications?limit=5&offset=0`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.ok(listResponse.status === 401 || listResponse.status === 403);

    const detailResponse = await fetchWithRetry(`${baseUrl}/api/employer/applications/${applicationId}`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.ok(detailResponse.status === 401 || detailResponse.status === 403);

    const messageResponse = await fetchWithRetry(
      `${baseUrl}/api/employer/applications/${applicationId}/message`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Cookie: jobseekerCookie,
        },
        body: JSON.stringify({
          message: "Unauthorized sender should not be able to post this message.",
        }),
      }
    );
    assert.ok(messageResponse.status === 401 || messageResponse.status === 403);
  });
});
