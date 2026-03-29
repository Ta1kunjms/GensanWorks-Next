import type { Page } from "@playwright/test";

type UserRole = "admin" | "employer" | "jobseeker";

function rolePrefix(role: UserRole): string {
  return role.toUpperCase();
}

export function getCredential(role: UserRole, field: "EMAIL" | "PASSWORD"): string | undefined {
  const key = `E2E_${rolePrefix(role)}_${field}`;
  return process.env[key];
}

export function requireRoleCredentials(role: UserRole): {
  email: string;
  password: string;
} | null {
  const email = getCredential(role, "EMAIL");
  const password = getCredential(role, "PASSWORD");

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export function allowE2EMutations(): boolean {
  return process.env.E2E_ALLOW_MUTATIONS === "1";
}

export async function loginAsRole(
  page: Page,
  role: UserRole,
  email: string,
  password: string,
  expectedDashboardPath: string
): Promise<void> {
  await page.goto(`/login?role=${role}`);
  await page.getByLabel("Who are you?").selectOption(role);
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`**${expectedDashboardPath}`);
}
