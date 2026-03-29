import { test, expect } from "@playwright/test";
import { loginAsRole, requireRoleCredentials } from "../tests/e2e-setup";

test.describe("employer workflow", () => {
  test("protected employer pages redirect anonymous users", async ({ page }) => {
    await page.goto("/employer/dashboard");
    await expect(page).toHaveURL(/\/login\?role=employer/);
  });

  test("authenticated employer can create and manage a job post", async ({ page }) => {
    const creds = requireRoleCredentials("employer");
    test.skip(!creds, "Missing credentials: E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD");
    if (!creds) return;

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

    const createdJobCard = page.locator("li", { hasText: title }).first();
    await expect(createdJobCard).toBeVisible();

    await createdJobCard.getByRole("button", { name: "active", exact: true }).click();
    await expect(createdJobCard.getByText(/Status:\s*active/i)).toBeVisible();

    await createdJobCard.getByRole("link", { name: "View applications" }).click();
    await expect(page.getByText("Review and update applicant status.")).toBeVisible();

    const noApplications = page.getByText("No applications yet.");
    if (!(await noApplications.isVisible())) {
      const firstApplicationCard = page.locator("li.border.rounded-md.p-4").first();
      await firstApplicationCard.getByRole("button", { name: "reviewed", exact: true }).click();
      await expect(firstApplicationCard.getByText(/Current:\s*reviewed/i)).toBeVisible();
    }
  });
});
