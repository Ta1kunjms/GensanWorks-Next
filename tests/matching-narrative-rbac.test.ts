import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

// Ensure mock Supabase environment variables and NODE_ENV exist before importing route dependencies
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
process.env.NODE_ENV = "test";

import { auth, __setMockAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ExplanationService } from "@/lib/matching/services/ExplanationService";
import { POST } from "@/api/matching/narrative/route";

describe("RBAC Authorization for /api/matching/narrative", () => {
  let origFrom: typeof supabaseAdmin.from;
  let origGenerateNarrative: typeof ExplanationService.generateNarrative;

  beforeEach(() => {
    origFrom = supabaseAdmin.from;
    origGenerateNarrative = ExplanationService.generateNarrative;
  });

  afterEach(() => {
    __setMockAuthSession(undefined);
    (supabaseAdmin as any).from = origFrom;
    ExplanationService.generateNarrative = origGenerateNarrative;
  });

  it("1. An unauthenticated request returns HTTP 401", async () => {
    __setMockAuthSession(null);

    const req = new Request("http://localhost/api/matching/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "job-101", jobseekerId: "js-202" }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error, "Unauthorized");
  });

  it("2. A jobseeker session requesting a narrative returns HTTP 403", async () => {
    __setMockAuthSession({ user: { id: "jobseeker-101", role: "jobseeker" } });

    const req = new Request("http://localhost/api/matching/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "job-101", jobseekerId: "jobseeker-101" }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.match(data.error, /Forbidden/i);
  });

  it("3. An employer requesting a narrative for a job they do not own returns HTTP 403", async () => {
    __setMockAuthSession({ user: { id: "employer-1", role: "employer" } });

    // Mock DB response: job is owned by employer-2
    (supabaseAdmin as any).from = (table: string) => {
      if (table === "jobs") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "job-unowned", employer_id: "employer-2" },
                error: null,
              }),
            }),
          }),
        };
      }
      return origFrom.call(supabaseAdmin, table);
    };

    const req = new Request("http://localhost/api/matching/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "job-unowned", jobseekerId: "js-202" }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.equal(data.error, "Forbidden: You can only request narratives for jobs you own.");
  });

  it("4. An employer requesting a narrative for a job they own is allowed", async () => {
    __setMockAuthSession({ user: { id: "employer-1", role: "employer" } });

    // Mock DB response: job is owned by employer-1
    (supabaseAdmin as any).from = (table: string) => {
      if (table === "jobs") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "job-owned", employer_id: "employer-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      return origFrom.call(supabaseAdmin, table);
    };

    ExplanationService.generateNarrative = async (jobId: string, jobseekerId: string) => {
      return {
        summary: "Candidate is a highly qualified software engineer.",
        strengths: ["Strong technical expertise"],
        concerns: [],
      } as any;
    };

    const req = new Request("http://localhost/api/matching/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "job-owned", jobseekerId: "js-202" }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.summary, "Candidate is a highly qualified software engineer.");
  });

  it("5. An admin requesting a narrative for any valid job/jobseeker pair is allowed", async () => {
    __setMockAuthSession({ user: { id: "admin-1", role: "admin" } });

    // Ensure ownership DB check is bypassed for admin
    (supabaseAdmin as any).from = () => {
      throw new Error("Admin must bypass job ownership query");
    };

    ExplanationService.generateNarrative = async (jobId: string, jobseekerId: string) => {
      return {
        summary: "Admin view: Candidate match narrative generated successfully.",
        strengths: ["Full admin authorization"],
        concerns: [],
      } as any;
    };

    const req = new Request("http://localhost/api/matching/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "any-job-id", jobseekerId: "js-202" }),
    });

    const res = await POST(req as any);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.summary, "Admin view: Candidate match narrative generated successfully.");
  });

  it("6. Ignores mock session when NODE_ENV is not 'test' and falls back to normal auth flow", async () => {
    __setMockAuthSession({ user: { id: "mock-admin-id", role: "admin" } });

    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const session = await auth();
      assert.equal(session, null, "auth() must return null (normal auth path) in production when no cookies exist");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
