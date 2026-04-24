#!/usr/bin/env node
/*
  Logs in using NextAuth credentials and prints a cookie header string.

  Required env vars:
    BASE_URL (default: http://localhost:3000)
    AUTH_EMAIL
    AUTH_PASSWORD
    AUTH_ROLE (admin | employer | jobseeker)
*/

const axios = require("axios");
const http = require("node:http");
const https = require("node:https");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const email = process.env.AUTH_EMAIL;
const password = process.env.AUTH_PASSWORD;
const role = (process.env.AUTH_ROLE || "jobseeker").toLowerCase();

if (!email || !password) {
  console.error("AUTH_EMAIL and AUTH_PASSWORD are required");
  process.exit(1);
}

const maxAttempts = Number(process.env.AUTH_COOKIE_MAX_ATTEMPTS || "5");
const csrfTimeoutMs = Number(process.env.AUTH_COOKIE_CSRF_TIMEOUT_MS || "0");
const callbackTimeoutMs = Number(process.env.AUTH_COOKIE_CALLBACK_TIMEOUT_MS || "0");

const axiosClient = axios.create({
  httpAgent: new http.Agent({ keepAlive: false }),
  httpsAgent: new https.Agent({ keepAlive: false }),
  validateStatus: () => true,
  transitional: {
    clarifyTimeoutError: true,
  },
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimeout(timeoutMs) {
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toCookieHeader(setCookieValues) {
  return toArray(setCookieValues)
    .map((value) => String(value).split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function formatError(error) {
  if (axios.isAxiosError(error)) {
    const codePart = error.code ? ` code=${error.code}` : "";
    const statusPart = error.response ? ` status=${error.response.status}` : "";
    const messagePart = error.message || "Axios request failed";
    return `${messagePart}${codePart}${statusPart}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function getCsrfToken() {
  const csrfRes = await axiosClient.get(`${baseUrl}/api/auth/csrf`, {
    timeout: getTimeout(csrfTimeoutMs),
  });

  if (csrfRes.status < 200 || csrfRes.status >= 300) {
    throw new Error(`Failed to fetch csrf token: ${csrfRes.status}`);
  }

  const csrfToken = csrfRes.data?.csrfToken;
  if (!csrfToken) {
    throw new Error("Missing csrf token response");
  }

  return {
    csrfToken,
    csrfCookieHeader: toCookieHeader(csrfRes.headers["set-cookie"]),
  };
}

async function loginWithCredentials(csrfToken, csrfCookieHeader) {
  const form = new URLSearchParams();
  form.set("csrfToken", csrfToken);
  form.set("email", email);
  form.set("password", password);
  form.set("role", role);
  form.set("callbackUrl", `${baseUrl}/${role}/dashboard`);
  form.set("json", "true");

  const signInRes = await axiosClient.post(
    `${baseUrl}/api/auth/callback/credentials`,
    form.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(csrfCookieHeader ? { Cookie: csrfCookieHeader } : {}),
      },
      maxRedirects: 0,
      timeout: getTimeout(callbackTimeoutMs),
    }
  );

  const setCookie = toArray(signInRes.headers["set-cookie"]);
  if (!setCookie.length) {
    const responseBody =
      typeof signInRes.data === "string"
        ? signInRes.data
        : JSON.stringify(signInRes.data ?? {});
    throw new Error(
      `No set-cookie header received. Status: ${signInRes.status}. Body: ${responseBody.slice(0, 180)}`
    );
  }

  const cookieHeader = toCookieHeader(setCookie);
  if (!cookieHeader) {
    throw new Error("Could not parse cookie header");
  }

  return cookieHeader;
}

async function resolveCookieHeader() {
  const { csrfToken, csrfCookieHeader } = await getCsrfToken();
  return loginWithCredentials(csrfToken, csrfCookieHeader);
}

async function main() {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const cookieHeader = await resolveCookieHeader();
      console.log(cookieHeader);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.error(`Attempt ${attempt}/${maxAttempts} failed: ${formatError(error)}`);
        await delay(400 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Auth cookie bootstrap failed");
}

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});
