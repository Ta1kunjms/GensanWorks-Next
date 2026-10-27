import type { Page } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { createHmac } from "node:crypto";

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

/**
 * RFC 6238 TOTP code (SHA-1, 30 s, 6 digits) from a base32 secret, for the
 * admin MFA step. The secret comes from E2E_ADMIN_TOTP_SECRET only.
 */
export function totpCode(base32Secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32Secret.replace(/[\s=]/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Invalid base32 TOTP secret");
    bits += value.toString(2).padStart(5, "0");
  }
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < key.length; i += 1) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);

  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return binary.toString().padStart(6, "0");
}

// Signs in through the real login forms (Supabase Auth). Admins then pass the
// TOTP step at /auth/mfa when E2E_ADMIN_TOTP_SECRET is set.
export async function loginAsRole(
  page: Page,
  role: UserRole,
  email: string,
  password: string,
  expectedDashboardPath: string
): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.context().clearCookies();

      if (role === "admin") {
        await page.goto("/login/admin", { waitUntil: "domcontentloaded" });
        await page.locator("#admin-login-email").fill(email);
        await page.locator("#admin-login-password").fill(password);
        await page.getByRole("button", { name: "Sign In as Admin" }).click();
      } else {
        await page.goto(`/login?role=${role}`, { waitUntil: "domcontentloaded" });
        await page.locator("#login-email").fill(email);
        await page.locator("#login-password").fill(password);
        await page.locator('form button[type="submit"]').click();
      }

      if (role === "admin") {
        await page.waitForURL(/\/auth\/mfa|\/admin\//, { timeout: 20000 });
        if (page.url().includes("/auth/mfa")) {
          const secret = process.env.E2E_ADMIN_TOTP_SECRET;
          if (!secret) throw new Error("Admin MFA required: set E2E_ADMIN_TOTP_SECRET");
          await page.locator("#mfa-code").fill(totpCode(secret));
          await page.getByRole("button", { name: "Verify and continue" }).click();
        }
      }

      await page.waitForURL(/\/(admin|employer|jobseeker)\/dashboard/, { timeout: 20000 });
      if (!page.url().includes(expectedDashboardPath)) {
        await page.goto(expectedDashboardPath, { waitUntil: "domcontentloaded" });
        await page.waitForURL(`**${expectedDashboardPath}`, { timeout: 20000 });
      }
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
