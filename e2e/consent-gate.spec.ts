// Task 13Z-W — end-to-end checks of the privacy-consent gate.
//
// Non-mutating by design (pilot data stays synthetic): no account is created
// and no consent is recorded. Every request either reads a page, follows a
// redirect, or is rejected by the server before any write. Safe to run against
// a deployed environment via E2E_BASE_URL.
//
// Not covered here (needs real Google test accounts, run manually): Google
// sign-in -> consent page -> accept/decline. See PROJECT_STATE.md section 9.

import { test, expect } from "@playwright/test";

const SYNTHETIC_EMAIL = () => `e2e.consent.${Date.now()}@example.invalid`;

test.describe("13Z-W consent gate", () => {
  test("signed-out visitors cannot open the consent page", async ({ page }) => {
    await page.goto("/auth/consent");
    await expect(page).toHaveURL(/\/login\?role=jobseeker/);
  });

  test("signed-out visitors cannot open portal pages", async ({ page }) => {
    await page.goto("/jobseeker/dashboard");
    await expect(page).toHaveURL(/\/login\?role=jobseeker/);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login\/admin/);
  });

  test("consent API rejects requests without a session", async ({ request }) => {
    for (const action of ["accept", "decline"]) {
      const response = await request.post("/api/auth/consent", { data: { action } });
      expect(response.status(), `${action} without a session`).toBe(401);
    }
  });

  test("OAuth callback without a code fails safely", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/auth\/auth-code-error/);
  });

  test("signup API refuses jobseeker and employer accounts without consent", async ({ request }) => {
    const jobseeker = await request.post("/api/auth/signup/jobseeker", {
      data: { firstName: "E2E", lastName: "Consent", email: SYNTHETIC_EMAIL(), password: "Abcd1234!x", consentAccepted: false },
    });
    expect(jobseeker.status()).toBe(400);

    const employer = await request.post("/api/auth/signup/employer", {
      data: { establishmentName: "E2E Consent Co", email: SYNTHETIC_EMAIL(), password: "Abcd1234!x" },
    });
    expect(employer.status()).toBe(400);
  });

  test("jobseeker signup shows an unchecked privacy consent box and the Google option", async ({ page }) => {
    await page.goto("/signup?role=jobseeker");
    const consent = page.locator("#privacy-ack");
    await expect(consent).toBeVisible();
    await expect(consent).not.toBeChecked();
    await expect(page.getByRole("link", { name: "Privacy Notice" }).first()).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });

  // Owner decision 2026-10-21: employers may also use Google; admin stays email-only.
  test("employer signup offers Google; admin login does not", async ({ page }) => {
    await page.goto("/signup?role=employer");
    await expect(page.locator("#privacy-ack")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

    await page.goto("/login/admin");
    await expect(page.getByRole("button", { name: /Google/i })).toHaveCount(0);
  });
});
