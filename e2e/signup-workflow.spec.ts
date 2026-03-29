import { test, expect } from "@playwright/test";
import { allowE2EMutations } from "../tests/e2e-setup";

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

test.describe("signup workflows", () => {
  test("jobseeker signup redirects to login", async ({ page }) => {
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to run record-creating signup tests");

    await page.goto("/signup/jobseeker");
    await page.getByLabel("Full Name").fill("E2E Jobseeker Signup");
    await page.getByLabel("Email").fill(uniqueEmail("jobseeker"));
    await page.getByLabel("Phone (optional)").fill("09171234567");
    await page
      .getByPlaceholder("At least 8 chars, uppercase, lowercase, number, symbol")
      .fill("Abcd1234!");

    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/login\?role=jobseeker&registered=1/);
  });

  test("employer signup redirects to login", async ({ page }) => {
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to run record-creating signup tests");

    await page.goto("/signup/employer");
    await page.getByLabel("Contact Person").fill("E2E Employer Contact");
    await page.getByLabel("Contact Phone").fill("09179876543");
    await page.getByLabel("Establishment Name").fill(`E2E Employer ${Date.now()}`);
    await page.getByLabel("Address").fill("Pioneer Avenue");
    await page.getByLabel("City").fill("General Santos City");
    await page.getByLabel("Province").fill("South Cotabato");
    await page.getByLabel("Email").fill(uniqueEmail("employer"));
    await page.getByLabel("Password").fill("Abcd1234!");

    await page.getByRole("button", { name: "Submit Employer Registration" }).click();
    await expect(page).toHaveURL(/\/login\?role=employer&registered=1/);
  });

  test("admin request signup submits successfully", async ({ page }) => {
    test.skip(!allowE2EMutations(), "Set E2E_ALLOW_MUTATIONS=1 to run record-creating signup tests");

    await page.goto("/signup/admin-request");
    await page.getByLabel("Full Name").fill("E2E Admin Requestor");
    await page.getByLabel("Email").fill(uniqueEmail("admin.request"));
    await page.getByLabel("Phone").fill("09170001111");
    await page.getByLabel("Organization").fill("E2E Test Org");
    await page.getByLabel("Notes (optional)").fill("Automated E2E admin request flow.");

    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(page.getByText("Request submitted successfully.")).toBeVisible();
  });
});
