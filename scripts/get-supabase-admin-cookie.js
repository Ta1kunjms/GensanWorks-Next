#!/usr/bin/env node
/*
  ============================================================
  LOCAL DEVELOPMENT AND TESTING USE ONLY
  DO NOT use against a production environment.
  DO NOT commit retrieved session cookies to version control.
  ============================================================

  Authenticates as an admin against the local Supabase project
  using signInWithPassword, then extracts and prints the resulting
  sb-*-auth-token cookie(s) to stdout so they can be captured
  into PHASE6_ADMIN_COOKIE for smoke tests.

  Usage:
    node scripts/get-supabase-admin-cookie.js | clip
    $env:PHASE6_ADMIN_COOKIE = (node scripts/get-supabase-admin-cookie.js)

  Env vars (all optional — seed defaults shown in comments):
    TEST_ADMIN_EMAIL     (default: admin@gensanworks.com)
    TEST_ADMIN_PASSWORD  (default: Admin123!)
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
*/

const fs = require("fs");
const path = require("path");

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Seed defaults documented in comments only — never hardcoded in live logic
// Default admin email:    admin@gensanworks.com
// Default admin password: Admin123!
const email = process.env.TEST_ADMIN_EMAIL || "admin@gensanworks.com";
const password = process.env.TEST_ADMIN_PASSWORD || "Admin123!";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  process.stderr.write(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.\n"
  );
  process.exit(1);
}

// ── Sign in via Supabase REST API ────────────────────────────────────────────
async function getAdminCookie() {
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    process.stderr.write(`ERROR: Network request to Supabase auth endpoint failed: ${err.message}\n`);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text();
    process.stderr.write(`ERROR: Supabase auth returned ${res.status}: ${body}\n`);
    process.exit(1);
  }

  const data = await res.json();

  if (!data.access_token) {
    process.stderr.write("ERROR: No access_token in Supabase auth response.\n");
    process.exit(1);
  }

  // Build the cookie string in the format @supabase/ssr expects:
  // sb-<project-ref>-auth-token=base64(JSON({access_token, refresh_token, ...}))
  // The project ref is the subdomain of the Supabase URL.
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const tokenPayload = JSON.stringify({
    access_token: data.access_token,
    token_type: data.token_type || "bearer",
    expires_in: data.expires_in || 3600,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + 3600,
    refresh_token: data.refresh_token,
    user: data.user,
  });

  const cookieValue = Buffer.from(tokenPayload).toString("base64");

  // Output cookie length to stderr (never to stdout to avoid leaking in logs)
  process.stderr.write(
    `Cookie retrieved successfully, length: ${cookieValue.length} characters\n`
  );
  process.stderr.write(`Cookie name: ${cookieName}\n`);

  // Print only the cookie header string to stdout for env var capture
  process.stdout.write(`${cookieName}=${cookieValue}`);
}

getAdminCookie();
