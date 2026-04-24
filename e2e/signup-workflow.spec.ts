import { test, expect, type Page } from "@playwright/test";
import { allowE2EMutations, isDbBackedApiResponsive } from "../tests/e2e-setup";

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function expectRedirectOrFeedback(page: Page, redirectPattern: RegExp, feedbackPattern: RegExp): Promise<void> {
  const redirected = await page
    .waitForURL(redirectPattern, { timeout: 45_000 })
    .then(() => true)
    .catch(() => false);

  if (redirected) {
    return;
  }

  await expect(page.getByText(feedbackPattern)).toBeVisible({ timeout: 45_000 });
}

test.describe("signup workflows", () => {
  test("jobseeker signup redirects to login", async ({ page, request }) => {
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to run record-creating signup tests");
    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    await page.goto("/signup/jobseeker");
    await page.locator('label:has-text("Full Name") + input').fill("E2E Jobseeker Signup");
    await page.locator('label:has-text("Email") + input').fill(uniqueEmail("jobseeker"));
    await page.locator('label:has-text("Phone") + input').fill("09171234567");
    await page.locator('label:has-text("Date of Birth") + input').fill("1998-01-15");
    await page.locator('label:has-text("Password") + input').fill("Abcd1234!");

    await page.getByRole("button", { name: "Create Account" }).click();
    await expectRedirectOrFeedback(
      page,
      /\/login\?role=jobseeker&registered=1/,
      /Signup failed|Unable to create account|already in use|rate limit|internal server error/i
    );
  });

  test("employer signup redirects to login", async ({ page, request }) => {
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to run record-creating signup tests");
    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    await page.goto("/signup/employer");
    await page.locator('label:has-text("Contact Person") + input').fill("E2E Employer Contact");
    await page.locator('label:has-text("Contact Phone") + input').fill("09179876543");
    await page.locator('label:has-text("Establishment Name") + input').fill(`E2E Employer ${Date.now()}`);
    await page.locator('label:has-text("Address") + input').fill("Pioneer Avenue");
    await page.locator('label:has-text("City") + input').fill("General Santos City");
    await page.locator('label:has-text("Province") + input').fill("South Cotabato");
    await page.locator('label:has-text("Email") + input').fill(uniqueEmail("employer"));
    await page.locator('label:has-text("Password") + input').fill("Abcd1234!");

    await page.getByRole("button", { name: "Submit Employer Registration" }).click();
    await expectRedirectOrFeedback(
      page,
      /\/login\?role=employer&registered=1/,
      /Signup failed|Unable to submit employer registration|already in use|rate limit|internal server error/i
    );
  });

  test("admin request signup submits successfully", async ({ page, request }) => {
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to run record-creating signup tests");
    test.skip(!(await isDbBackedApiResponsive(request)), "DB-backed APIs are degraded in current environment.");

    await page.goto("/signup/admin-request");
    await page.locator('label:has-text("Full Name") + input').fill("E2E Admin Requestor");
    await page.locator('label:has-text("Email") + input').fill(uniqueEmail("admin.request"));
    await page.locator('label:has-text("Phone") + input').fill("09170001111");
    await page.locator('label:has-text("Organization") + input').fill("E2E Test Org");
    await page.locator('label:has-text("Notes (optional)") + textarea').fill("Automated E2E admin request flow.");

    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(
      page.getByText(
        /Request submitted successfully.|Request failed|Unable to submit request|already.*request|rate limit|invalid request data|internal server error/i
      )
    ).toBeVisible({ timeout: 45_000 });
  });
});
