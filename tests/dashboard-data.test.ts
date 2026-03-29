import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fetchAdminDashboardData,
  fetchEmployerDashboardData,
  fetchJobseekerDashboardData,
} from "@/lib/dashboard-data";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("dashboard data fetchers", () => {
  it("fetchAdminDashboardData returns summary and jobs", async () => {
    const calls: string[] = [];
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      calls.push(url);

      if (url.startsWith("/api/admin/summary")) {
        return jsonResponse({
          usersCount: 10,
          employersCount: 3,
          jobsCount: 7,
          applicationsCount: 25,
          pendingEmployerCount: 1,
          pendingAdminRequests: 2,
          pendingJobs: 4,
        });
      }

      return jsonResponse({
        jobs: [
          {
            id: "job-1",
            positionTitle: "Software Engineer",
            status: "active",
            isPublished: true,
            archived: false,
            createdAt: new Date().toISOString(),
            employerId: "emp-1",
            establishmentName: "Acme Corp",
          },
        ],
      });
    };

    const data = await fetchAdminDashboardData("active", fetcher);

    assert.equal(calls.length, 2);
    assert.ok(calls[1]?.includes("status=active"));
    assert.equal(data.summary.usersCount, 10);
    assert.equal(data.jobs.length, 1);
    assert.equal(data.jobs[0]?.positionTitle, "Software Engineer");
  });

  it("fetchAdminDashboardData throws when any request fails", async () => {
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith("/api/admin/summary")) {
        return jsonResponse({ error: "nope" }, 500);
      }
      return jsonResponse({ jobs: [] });
    };

    await assert.rejects(async () => fetchAdminDashboardData("all", fetcher));
  });

  it("fetchEmployerDashboardData limits jobs to five", async () => {
    const jobs = Array.from({ length: 8 }, (_, index) => ({
      id: `job-${index + 1}`,
      positionTitle: `Role ${index + 1}`,
      status: "active",
      createdAt: new Date().toISOString(),
    }));

    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith("/api/employer/summary")) {
        return jsonResponse({
          jobsCount: 8,
          activeJobsCount: 7,
          applicationsCount: 40,
          pendingApplicationsCount: 9,
        });
      }

      return jsonResponse({ jobs });
    };

    const data = await fetchEmployerDashboardData(fetcher);
    assert.equal(data.summary?.jobsCount, 8);
    assert.equal(data.jobs.length, 5);
    assert.equal(data.jobs[4]?.id, "job-5");
  });

  it("fetchJobseekerDashboardData returns empty arrays when a request fails", async () => {
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith("/api/jobseeker/jobs")) {
        return jsonResponse({ jobs: [] });
      }
      return jsonResponse({ error: "unauthorized" }, 401);
    };

    const data = await fetchJobseekerDashboardData(fetcher);
    assert.deepEqual(data.jobs, []);
    assert.deepEqual(data.applications, []);
  });

  it("fetchJobseekerDashboardData returns jobs and applications when requests succeed", async () => {
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith("/api/jobseeker/jobs")) {
        return jsonResponse({
          jobs: [
            {
              id: "job-11",
              positionTitle: "QA Tester",
              location: "General Santos City",
              establishmentName: "Bright Labs",
            },
          ],
        });
      }

      return jsonResponse({
        applications: [
          {
            id: "app-11",
            status: "pending",
            positionTitle: "QA Tester",
            employerName: "Bright Labs",
          },
        ],
      });
    };

    const data = await fetchJobseekerDashboardData(fetcher);
    assert.equal(data.jobs.length, 1);
    assert.equal(data.applications.length, 1);
    assert.equal(data.applications[0]?.status, "pending");
  });
});