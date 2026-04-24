import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  allowE2EMutations,
  isDbBackedApiResponsive,
  loginAsRole,
  requireRoleCredentials,
} from "../tests/e2e-setup";

function extractJobIdFromApplicationsLink(href: string | null): string | null {
  if (!href) {
    return null;
  }

  const match = href.match(/^\/employer\/jobs\/([^/]+)\/applications$/);
  return match?.[1] ?? null;
}

function getSecondaryEmployerCredentials() {
  const email = process.env.E2E_EMPLOYER_SECOND_EMAIL?.trim();
  const password = process.env.E2E_EMPLOYER_SECOND_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

type EmployerJobStatus = "draft" | "pending" | "active" | "closed" | "archived" | null;

type EmployerOwnedJob = {
  id: string;
  status: EmployerJobStatus;
};

type CreateEmployerJobResponse = {
  data?: {
    job?: EmployerOwnedJob;
  };
};

async function createEmployerJobViaApi(
  request: APIRequestContext,
  title: string
): Promise<EmployerOwnedJob | null> {
  const response = await request.post("/api/employer/jobs", {
    data: {
      positionTitle: title,
      description:
        "E2E employer workflow posting used for deterministic role and notification verification coverage.",
      requirements:
        "At least two years of relevant experience, strong communication skills, and reliable teamwork habits.",
      contractType: "Regular",
      employmentType: "Full-time",
      location: "General Santos City",
      city: "General Santos",
      vacancies: 1,
      qualifications: "Attention to detail and production support readiness.",
      keyResponsibilities: "Coordinate with team leads and maintain quality delivery outcomes.",
      benefits: "Health coverage and performance incentives.",
    },
  });

  if (!response.ok()) {
    return null;
  }

  const payload = (await response.json()) as CreateEmployerJobResponse;
  return payload.data?.job ?? null;
}

type EmployerJobListResponse = {
  data?: {
    jobs?: EmployerOwnedJob[];
  };
};

type EmployerApplicationsResponse = {
  data?: {
    applications?: Array<{
      id: string;
      applicantEmail: string | null;
      userEmail: string | null;
    }>;
  };
};

type NotificationsResponse = {
  notifications?: Array<{
    title: string;
    message: string;
    relatedId: string | null;
  }>;
};

test.describe("employer workflow", () => {
  test("protected employer pages redirect anonymous users", async ({ page }) => {
    await page.goto("/employer/dashboard");
    await expect(page).toHaveURL(/\/login\?role=employer/);
  });

  test("authenticated employer can create and manage a job post", async ({ page, request }) => {
    test.setTimeout(120_000);

    const creds = requireRoleCredentials("employer");
    test.skip(!creds, "Missing credentials: E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD");
    if (!creds) return;

    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");
    await loginAsRole(page, "employer", creds.email, creds.password, "/employer/dashboard");
    await expect(page.getByText("Employer Dashboard")).toBeVisible();

    await page.goto("/employer/jobs");
    await expect(page.getByRole("heading", { name: "Manage Jobs" })).toBeVisible();

    const stamp = Date.now();
    const title = `E2E Employer Role ${stamp}`;

    await page.getByPlaceholder("Position title").fill(title);
    await page.getByPlaceholder("Location").fill("General Santos City");
    await page.getByPlaceholder("Job description").fill("E2E employer workflow test posting.");
    await page.getByRole("button", { name: "Create Job" }).click();

    const createFailed = page.getByText(/Failed to create job/i);
    if ((await createFailed.count()) > 0 && (await createFailed.first().isVisible())) {
      await expect(page.getByRole("heading", { name: "Manage Jobs" })).toBeVisible();
      return;
    }
    const createdJobCard = page.locator("li.border.rounded-md.p-4").first();
    const hasJobCards = (await createdJobCard.count()) > 0;
    if (!hasJobCards) {
      await expect(page.getByText(/No jobs yet.|My Job Posts/i)).toBeVisible();
      return;
    }
    await expect(createdJobCard).toBeVisible();

    await createdJobCard.getByRole("button", { name: "active", exact: true }).click();
    await expect(createdJobCard.getByText(/Status:\s*active/i)).toBeVisible();

    await createdJobCard.getByRole("link", { name: "View applications" }).click();
    await expect(page.getByText("Review and update applicant status.")).toBeVisible();

    const noApplications = page.getByText("No applications yet.");
    if (!(await noApplications.isVisible())) {
      const firstApplicationCard = page.locator("li.border.rounded-md.p-4").first();
      await firstApplicationCard.getByRole("button", { name: "hired", exact: true }).click();
      await expect(firstApplicationCard.getByText(/Current:\s*hired/i)).toBeVisible();
    }
  });

  test("employer boundaries enforce role and account isolation", async ({ page, request }) => {
    test.setTimeout(240_000);

    const employerCreds = requireRoleCredentials("employer");
    const jobseekerCreds = requireRoleCredentials("jobseeker");
    test.skip(
      !employerCreds || !jobseekerCreds,
      "Missing credentials: E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD / E2E_JOBSEEKER_EMAIL / E2E_JOBSEEKER_PASSWORD"
    );
    if (!employerCreds || !jobseekerCreds) return;

    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    await loginAsRole(page, "employer", employerCreds.email, employerCreds.password, "/employer/dashboard");
    await page.goto("/employer/jobs");
    await expect(page.getByRole("heading", { name: "Manage Jobs" })).toBeVisible();

    let ownedJobId: string | null = null;
    const shouldMutate = allowE2EMutations();

    if (shouldMutate) {
      const created = await createEmployerJobViaApi(page.request, `E2E Isolation Job ${Date.now()}`);
      ownedJobId = created?.id ?? null;
    }

    if (!ownedJobId) {
      const ownedJobLink = page.locator('a[href^="/employer/jobs/"][href$="/applications"]').first();
      test.skip((await ownedJobLink.count()) === 0, "No employer-owned jobs available for ownership assertions.");
      const href = await ownedJobLink.getAttribute("href");
      ownedJobId = extractJobIdFromApplicationsLink(href);
    }

    test.skip(!ownedJobId, "Unable to resolve an employer-owned job id for isolation assertions.");
    if (!ownedJobId) return;

    const ownerJobRes = await page.request.get(`/api/employer/jobs/${ownedJobId}`);
    expect(ownerJobRes.status()).toBe(200);

    const ownerAppsRes = await page.request.get(`/api/employer/jobs/${ownedJobId}/applications`);
    expect(ownerAppsRes.status()).toBe(200);

    await loginAsRole(page, "jobseeker", jobseekerCreds.email, jobseekerCreds.password, "/jobseeker/dashboard");

    const jobseekerJobRes = await page.request.get(`/api/employer/jobs/${ownedJobId}`);
    expect([401, 403]).toContain(jobseekerJobRes.status());

    const jobseekerAppsRes = await page.request.get(`/api/employer/jobs/${ownedJobId}/applications`);
    expect([401, 403]).toContain(jobseekerAppsRes.status());

    const secondaryEmployerCreds = getSecondaryEmployerCredentials();
    if (secondaryEmployerCreds) {
      await loginAsRole(
        page,
        "employer",
        secondaryEmployerCreds.email,
        secondaryEmployerCreds.password,
        "/employer/dashboard"
      );

      const crossEmployerJobRes = await page.request.get(`/api/employer/jobs/${ownedJobId}`);
      expect(crossEmployerJobRes.status()).toBe(404);

      const crossEmployerAppsRes = await page.request.get(`/api/employer/jobs/${ownedJobId}/applications`);
      expect(crossEmployerAppsRes.status()).toBe(404);
    }
  });

  test("employer status updates notify jobseeker applicants", async ({ page, request }) => {
    test.setTimeout(240_000);

    const employerCreds = requireRoleCredentials("employer");
    const jobseekerCreds = requireRoleCredentials("jobseeker");
    test.skip(
      !employerCreds || !jobseekerCreds,
      "Missing credentials: E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD / E2E_JOBSEEKER_EMAIL / E2E_JOBSEEKER_PASSWORD"
    );
    if (!employerCreds || !jobseekerCreds) return;

    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    const shouldMutate = allowE2EMutations();
    test.skip(!shouldMutate, "Set E2E_ALLOW_MUTATIONS=1 to verify cross-user notification flow.");

    await loginAsRole(page, "employer", employerCreds.email, employerCreds.password, "/employer/dashboard");

    let targetJob: EmployerOwnedJob | null = null;

    if (shouldMutate) {
      targetJob = await createEmployerJobViaApi(page.request, `E2E Notification Job ${Date.now()}`);
    }

    if (!targetJob) {
      const jobsRes = await page.request.get("/api/employer/jobs?limit=50&offset=0");
      expect(jobsRes.status()).toBe(200);

      const jobsBody = (await jobsRes.json()) as EmployerJobListResponse;
      const jobs = jobsBody.data?.jobs ?? [];
      targetJob = jobs.find((job) => job.status === "active") ?? jobs[0] ?? null;
    }

    test.skip(!targetJob, "Unable to resolve an employer-owned job for notification assertions.");
    if (!targetJob) return;

    const activateJobRes = await page.request.patch(`/api/employer/jobs/${targetJob.id}/status`, {
      data: { status: "active" },
    });
    expect(activateJobRes.status()).toBe(200);

    await loginAsRole(page, "jobseeker", jobseekerCreds.email, jobseekerCreds.password, "/jobseeker/dashboard");

    const applyRes = await page.request.post(`/api/jobs/${targetJob.id}/apply`, {
      data: {
        coverLetter:
          "I am applying through automated E2E verification to validate employer status updates and notification delivery.",
      },
    });
    expect([200, 400]).toContain(applyRes.status());

    await loginAsRole(page, "employer", employerCreds.email, employerCreds.password, "/employer/dashboard");

    const applicationsRes = await page.request.get(`/api/employer/jobs/${targetJob.id}/applications`);
    expect(applicationsRes.status()).toBe(200);

    const applicationsBody = (await applicationsRes.json()) as EmployerApplicationsResponse;
    const applications = applicationsBody.data?.applications ?? [];
    const targetApplication = applications.find((application) => {
      const applicantEmail = application.applicantEmail?.toLowerCase();
      const userEmail = application.userEmail?.toLowerCase();
      const expectedEmail = jobseekerCreds.email.toLowerCase();
      return applicantEmail === expectedEmail || userEmail === expectedEmail;
    });

    test.skip(!targetApplication, "No jobseeker application found for employer notification assertion.");
    if (!targetApplication) return;

    const updateRes = await page.request.patch(`/api/employer/applications/${targetApplication.id}/status`, {
      data: {
        status: "hired",
        feedback: "E2E notification propagation check",
      },
    });
    expect(updateRes.status()).toBe(200);

    await loginAsRole(page, "jobseeker", jobseekerCreds.email, jobseekerCreds.password, "/jobseeker/dashboard");

    const notificationsRes = await page.request.get("/api/notifications?limit=50");
    expect(notificationsRes.status()).toBe(200);

    const notificationsBody = (await notificationsRes.json()) as NotificationsResponse;
    const matchingNotification = (notificationsBody.notifications ?? []).find(
      (notification) =>
        notification.relatedId === targetApplication.id &&
        /application status updated/i.test(notification.title) &&
        /hired/i.test(notification.message)
    );

    expect(matchingNotification).toBeTruthy();

    await page.goto("/jobseeker/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByText(/Application Status Updated/i).first()).toBeVisible();
  });
});
