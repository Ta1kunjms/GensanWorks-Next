import type { Page } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

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
  const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.context().clearCookies();
      const csrfResponse = await page.request.get("/api/auth/csrf");
      if (!csrfResponse.ok()) {
        throw new Error(`CSRF token request failed (${csrfResponse.status()})`);
      }

      const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
      const csrfToken = csrfPayload.csrfToken;
      if (!csrfToken) {
        throw new Error("Missing CSRF token in auth response");
      }

      const formBody = new URLSearchParams();
      formBody.set("csrfToken", csrfToken);
      formBody.set("email", email);
      formBody.set("password", password);
      formBody.set("role", role);
      formBody.set("callbackUrl", `${baseUrl}${expectedDashboardPath}`);
      formBody.set("json", "true");

      const callbackResponse = await page.request.post("/api/auth/callback/credentials", {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: formBody.toString(),
      });

      if (!callbackResponse.ok()) {
        throw new Error(`Credentials callback failed (${callbackResponse.status()})`);
      }

      const callbackBody = await callbackResponse.text();
      if (/CredentialsSignin|error=CredentialsSignin/i.test(callbackBody)) {
        throw new Error("Credential login rejected by auth callback");
      }

      await page.goto(expectedDashboardPath, { waitUntil: "domcontentloaded" });
      await page.waitForURL(`**${expectedDashboardPath}`, { timeout: 20000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Role login failed after retries");
}
export async function isDbBackedApiResponsive(request: APIRequestContext): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
        const res = await request.get("/api/summary?probe=1", { timeout: 15_000 });
      if (res.ok()) {
        return true;
      }
    } catch {
      // Retry once before declaring DB-backed APIs degraded.
    }
  }

  return false;
}
