import { test, expect } from "@playwright/test";
import { isDbBackedApiResponsive, loginAsRole, requireRoleCredentials } from "../tests/e2e-setup";

test.describe("responsive workflow", () => {
  test("public pages render on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Browse Jobs" }).first()).toBeVisible();

    await page.goto("/jobseeker/jobs");
    await expect(page).toHaveURL(/\/login\?role=jobseeker/);

    await page.goto("/login?role=jobseeker");
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  });

  test("authenticated jobseeker dashboard flow works on mobile viewport", async ({ page, request }) => {
    test.setTimeout(120_000);

    const creds = requireRoleCredentials("jobseeker");
    test.skip(!creds, "Missing credentials: E2E_JOBSEEKER_EMAIL / E2E_JOBSEEKER_PASSWORD");
    if (!creds) return;

    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    await page.setViewportSize({ width: 390, height: 844 });

    await loginAsRole(page, "jobseeker", creds.email, creds.password, "/jobseeker/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();

    await page.goto("/jobseeker/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();

    await page.goto("/jobseeker/applications", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible();
  });
});
