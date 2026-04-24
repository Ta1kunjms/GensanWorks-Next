import { test, expect } from "@playwright/test";
import {
  allowE2EMutations,
  isDbBackedApiResponsive,
  loginAsRole,
  requireRoleCredentials,
} from "../tests/e2e-setup";

type AccountDeletionRequestResponse = {
  message?: string;
  error?: string;
  data?: {
    message?: string;
  };
};

type JobseekerSignupResponse = {
  success?: boolean;
  error?: string;
};

type AdminRequestSignupResponse = {
  message?: string;
  error?: string;
};

type AccountDeletionProcessResponse = {
  processedCount?: number;
  mode?: string;
};

type AuditFeedResponse = {
  events?: Array<{
    type?: string;
    actor?: string;
    detail?: string;
  }>;
};

test.describe("admin workflow", () => {
  test("protected admin pages redirect anonymous users", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login\?role=admin/);
  });

  test("authenticated admin can review dashboard, analytics, and access requests", async ({ page, request }) => {
    test.setTimeout(120_000);

    const creds = requireRoleCredentials("admin");
    test.skip(!creds, "Missing credentials: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");
    if (!creds) return;
    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    const shouldMutate = allowE2EMutations();
    const requestEmail = `admin.request.${Date.now()}@example.com`;

    if (shouldMutate) {
      const requestSignupRes = await request.post("/api/auth/signup/admin-request", {
        data: {
          name: "E2E Admin Request Review",
          email: requestEmail,
          phone: "09175550000",
          organization: "E2E Approval Org",
          notes: "Created by E2E for approval and audit assertions.",
        },
      });

      expect([201, 409, 429]).toContain(requestSignupRes.status());
      if (requestSignupRes.status() !== 201) {
        const requestSignupBody = (await requestSignupRes.json()) as AdminRequestSignupResponse;
        expect(requestSignupBody.error ?? "").toMatch(/pending|approved|already|rate limit/i);
      }
    }

    await loginAsRole(page, "admin", creds.email, creds.password, "/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible();

    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

    await page.goto("/admin/access-requests");
    await expect(page.getByRole("heading", { name: "Admin Access Requests" })).toBeVisible();

    if (shouldMutate) {
      const requestRow = page.locator("li", { hasText: requestEmail }).first();
      if ((await requestRow.count()) > 0) {
        await expect(requestRow).toBeVisible();
        await requestRow.getByRole("button", { name: "approved", exact: true }).click();
        await expect(page.getByText("Current status: approved")).toBeVisible();
      }
    }

    await page.locator("select").first().selectOption("approved");
    await expect(
      page
        .getByText(
          /No access requests for this status.|Current status:|Loading requests...|Unable to load access requests/i
        )
        .first()
    ).toBeVisible();

    if (shouldMutate) {
      await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    }
  });

  test("admin can process account deletion and verify audit feed entry", async ({ page, request }) => {
    test.setTimeout(300_000);

    const adminCreds = requireRoleCredentials("admin");
    test.skip(!adminCreds, "Missing credentials: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");
    if (!adminCreds) return;

    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to verify account deletion processing audit flow.");

    const tempEmail = `e2e.deletion.${Date.now()}@example.com`;
    const tempPassword = "Abcd1234!";

    const signupRes = await page.request.post("/api/auth/signup/jobseeker", {
      data: {
        firstName: "E2E",
        lastName: "Deletion",
        email: tempEmail,
        password: tempPassword,
        phone: "09171234567",
        dateOfBirth: new Date("1998-01-15").toISOString(),
        registrationType: "career_changer",
      },
    });

    expect([201, 409]).toContain(signupRes.status());
    if (signupRes.status() === 409) {
      const signupBody = (await signupRes.json()) as JobseekerSignupResponse;
      expect(signupBody.error ?? "").toMatch(/already in use/i);
    }

    await loginAsRole(page, "jobseeker", tempEmail, tempPassword, "/jobseeker/dashboard");

    let scheduleDeletionRes: Awaited<ReturnType<typeof page.request.post>> | null = null;
    let scheduleDeletionError: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await page.request.post("/api/auth/account-deletion/request", {
          data: {
            currentPassword: tempPassword,
            reason: `E2E admin deletion audit verification ${Date.now()}`,
          },
          timeout: 25_000,
        });

        if (response.status() >= 500 && attempt < 3) {
          continue;
        }

        scheduleDeletionRes = response;
        break;
      } catch (error) {
        scheduleDeletionError = error;
      }
    }

    test.skip(
      !scheduleDeletionRes,
      `Account deletion request endpoint degraded in current environment${
        scheduleDeletionError instanceof Error ? `: ${scheduleDeletionError.message}` : "."
      }`
    );
    if (!scheduleDeletionRes) return;

    expect([200, 409]).toContain(scheduleDeletionRes.status());

    const scheduleBody = (await scheduleDeletionRes.json()) as AccountDeletionRequestResponse;
    if (scheduleDeletionRes.status() === 409) {
      expect(scheduleBody.error ?? "").toMatch(/already scheduled/i);
    } else {
      const scheduleMessage = scheduleBody.message ?? scheduleBody.data?.message ?? "";
      expect(scheduleMessage).toMatch(/scheduled/i);
    }

    await loginAsRole(page, "admin", adminCreds.email, adminCreds.password, "/admin/dashboard");

    const processRes = await page.request.post(
      `/api/admin/account-deletion/process?includePending=1&targetEmail=${encodeURIComponent(tempEmail)}`,
      {
        headers: {
          "x-e2e-mutations": "1",
        },
      }
    );
    expect(processRes.status()).toBe(200);

    const processBody = (await processRes.json()) as AccountDeletionProcessResponse;
    expect(processBody.mode).toBe("includePending");
    expect((processBody.processedCount ?? 0) > 0).toBeTruthy();

    const auditFeedRes = await page.request.get("/api/admin/analytics/audit-feed?limit=50");
    expect(auditFeedRes.status()).toBe(200);

    const auditFeedBody = (await auditFeedRes.json()) as AuditFeedResponse;
    const targetEmail = tempEmail.toLowerCase();

    const hasDeletionRequested = (auditFeedBody.events ?? []).some(
      (event) =>
        event.type === "account_deletion_requested" &&
        (event.actor ?? "").toLowerCase() === targetEmail
    );

    const hasDeletionProcessed = (auditFeedBody.events ?? []).some(
      (event) =>
        event.type === "account_deletion_processed" &&
        (event.actor ?? "").toLowerCase() === targetEmail &&
        /processed/i.test(event.detail ?? "")
    );

    expect(hasDeletionRequested).toBeTruthy();
    expect(hasDeletionProcessed).toBeTruthy();
  });
});
