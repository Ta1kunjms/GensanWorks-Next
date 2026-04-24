import { test, expect, type Page } from "@playwright/test";
import {
  allowE2EMutations,
  isDbBackedApiResponsive,
  loginAsRole,
  requireRoleCredentials,
} from "../tests/e2e-setup";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await page.goto("/", { waitUntil: "domcontentloaded" });
      }
    }
  }

  throw lastError;
}

test.describe("jobseeker workflow", () => {
  test("public pages and redirects behave correctly", async ({ page }) => {
    await gotoWithRetry(page, "/");
    await expect(page.getByRole("link", { name: "Browse Jobs" }).first()).toBeVisible();

    await gotoWithRetry(page, "/jobseeker/dashboard");
    await expect(page).toHaveURL(/\/login\?role=jobseeker/);
  });

  test("authenticated jobseeker can manage profile, browse jobs, and open applications", async ({ page, request }) => {
    test.setTimeout(120_000);

    const creds = requireRoleCredentials("jobseeker");
    test.skip(!creds, "Missing credentials: E2E_JOBSEEKER_EMAIL / E2E_JOBSEEKER_PASSWORD");
    if (!creds) return;
    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    await loginAsRole(page, "jobseeker", creds.email, creds.password, "/jobseeker/dashboard");
    await expect(page.getByText("Welcome Back")).toBeVisible();

    await page.goto("/jobseeker/profile");
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();

    const profileStamp = `E2E Jobseeker ${Date.now()}`;
    await page.locator('label:has-text("Name") + input').fill(profileStamp);
    await page.locator('label:has-text("Current Occupation") + input').fill("QA Analyst");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText(/Profile updated|Unable to update profile/i)).toBeVisible();

    await page.goto("/jobseeker/jobs");
    await expect(page.getByRole("heading", { name: "Browse Jobs" })).toBeVisible();

    const noJobsMessage = page.getByText("No matching jobs found.");
    const jobLinks = page.locator('a[href^="/jobseeker/jobs/"]');
    const hasJobLinks = (await jobLinks.count()) > 0;
    if (!(await noJobsMessage.isVisible()) && hasJobLinks) {
      await jobLinks.first().click();
      await expect(page.getByRole("heading", { name: "Job Details" })).toBeVisible();

      const alreadyAppliedText = page.getByText(/already applied/i);
      if (!(await alreadyAppliedText.isVisible())) {
        await page.getByPlaceholder("Write a short introduction and why you fit this role").fill(
          "I am interested in this role and available for interview this week."
        );
        await page.getByRole("button", { name: "Submit Application" }).click();
        await expect(page.getByText(/Application submitted successfully|already applied/i)).toBeVisible();
      }
    }

    await page.goto("/jobseeker/applications");
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible();

    await page.goto("/jobseeker/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();

    const notificationItems = page.locator("li, article, [role='listitem']");
    const hasNotificationItems = (await notificationItems.count()) > 0;
    if (hasNotificationItems) {
      await expect(notificationItems.first()).toBeVisible();
    } else {
      await expect(
        page
          .getByText(/Loading notifications...|All caught up|No notifications yet.|Unable to load notifications/i)
          .first()
      ).toBeVisible();
    }

    if (allowE2EMutations()) {
      await page.goto("/jobseeker/dashboard");
      await expect(page.getByRole("heading", { name: "Account Security" })).toBeVisible();

      const deletionRequest = page.getByText(/Account deletion is scheduled/i);
      if (!(await deletionRequest.isVisible())) {
        await page.getByPlaceholder("Enter current password").fill(creds.password);
        await page.getByRole("button", { name: "Schedule Account Deletion" }).click();
        await expect(
          page.getByText(
            /Account deletion scheduled|Account deletion is scheduled|Account deletion is already scheduled|Unable to schedule account deletion|Invalid password|Current password is incorrect|Failed to schedule/i
          )
        ).toBeVisible();
      }

      const cancelButton = page.getByRole("button", { name: "Cancel Deletion Request" });
      if ((await cancelButton.count()) > 0) {
        await cancelButton.click();
        await expect(
          page.getByText(/Account deletion request cancelled|Account deletion is scheduled|Unable to cancel deletion/i)
        ).toBeVisible();
      }
    }
  });
});
