import { test, expect } from "@playwright/test";
import { loginAsRole, requireRoleCredentials } from "../tests/e2e-setup";

test.describe("jobseeker workflow", () => {
  test("public pages and redirects behave correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "GensanWorks", level: 1 })).toBeVisible();

    await page.goto("/jobseeker/dashboard");
    await expect(page).toHaveURL(/\/login\?role=jobseeker/);
  });

  test("authenticated jobseeker can manage profile, browse jobs, and open applications", async ({ page }) => {
    const creds = requireRoleCredentials("jobseeker");
    test.skip(!creds, "Missing credentials: E2E_JOBSEEKER_EMAIL / E2E_JOBSEEKER_PASSWORD");
    if (!creds) return;

    await loginAsRole(page, "jobseeker", creds.email, creds.password, "/jobseeker/dashboard");
    await expect(page.getByText("Welcome Back")).toBeVisible();

    await page.goto("/jobseeker/profile");
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();

    const profileStamp = `E2E Jobseeker ${Date.now()}`;
    await page.locator('label:has-text("Name") + input').fill(profileStamp);
    await page.locator('label:has-text("Current Occupation") + input').fill("QA Analyst");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText(/Profile updated/i)).toBeVisible();

    await page.goto("/jobseeker/jobs");
    await expect(page.getByRole("heading", { name: "Browse Jobs" })).toBeVisible();

    const noJobsMessage = page.getByText("No matching jobs found.");
    if (!(await noJobsMessage.isVisible())) {
      await page.locator('a[href^="/jobseeker/jobs/"]').first().click();
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
  });
});
