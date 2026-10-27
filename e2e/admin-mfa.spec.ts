import { test, expect } from "@playwright/test";

// Public, non-mutating checks for admin two-step verification. Signed-in
// enrollment/verification is covered by loginAsRole("admin") with
// E2E_ADMIN_TOTP_SECRET in admin-workflow.spec.ts.
test.describe("admin MFA (signed out)", () => {
  test("signed-out visitors on the MFA page are sent to admin login", async ({ page }) => {
    await page.goto("/auth/mfa");
    await page.waitForURL("**/login/admin");
    await expect(page.locator("#admin-login-email")).toBeVisible();
  });

  test("admin portal pages still require sign-in", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await page.waitForURL("**/login/admin");
  });

  test("admin APIs reject requests without a session", async ({ request }) => {
    const response = await request.get("/api/admin/dashboard/summary");
    expect([401, 403]).toContain(response.status());
  });
});
