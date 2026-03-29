import { test, expect } from "@playwright/test";
import { allowE2EMutations, loginAsRole, requireRoleCredentials } from "../tests/e2e-setup";

test.describe("admin workflow", () => {
  test("protected admin pages redirect anonymous users", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login\?role=admin/);
  });

  test("authenticated admin can review dashboard, analytics, and access requests", async ({ page }) => {
    const creds = requireRoleCredentials("admin");
    test.skip(!creds, "Missing credentials: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD");
    if (!creds) return;

    const shouldMutate = allowE2EMutations();
    const requestEmail = `admin.request.${Date.now()}@example.com`;

    if (shouldMutate) {
      await page.goto("/signup/admin-request");
      await page.getByLabel("Full Name").fill("E2E Admin Request Review");
      await page.getByLabel("Email").fill(requestEmail);
      await page.getByLabel("Phone").fill("09175550000");
      await page.getByLabel("Organization").fill("E2E Approval Org");
      await page.getByLabel("Notes (optional)").fill("Created by E2E for approval and audit assertions.");
      await page.getByRole("button", { name: "Submit Request" }).click();
      await expect(page.getByText("Request submitted successfully.")).toBeVisible();
    }

    await loginAsRole(page, "admin", creds.email, creds.password, "/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible();

    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    await expect(page.getByText("Recent Admin Activity")).toBeVisible();

    await page.goto("/admin/access-requests");
    await expect(page.getByRole("heading", { name: "Admin Access Requests" })).toBeVisible();

    if (shouldMutate) {
      const requestRow = page.locator("li", { hasText: requestEmail }).first();
      await expect(requestRow).toBeVisible();
      await requestRow.getByRole("button", { name: "approved", exact: true }).click();
      await expect(page.getByText("Current status: approved")).toBeVisible();
    }

    await page.locator("select").first().selectOption("approved");
    await expect(page.getByText(/No access requests for this status.|Current status:/)).toBeVisible();

    if (shouldMutate) {
      await page.goto("/admin/analytics");
      await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
      await expect(page.getByText(`Actor: ${requestEmail}`)).toBeVisible();
    }
  });
});
