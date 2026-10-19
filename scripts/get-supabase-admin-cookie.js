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

const { createServerClient } = require("@supabase/ssr");

async function getAdminCookie() {
  const cookieMap = new Map();

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieMap.get(name);
        },
        set(name, value, options) {
          cookieMap.set(name, value);
        },
        remove(name, options) {
          cookieMap.delete(name);
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    process.stderr.write(`ERROR: Supabase auth failed: ${error.message}\n`);
    process.exit(1);
  }

  const cookieHeader = Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  process.stderr.write(
    `Cookie retrieved successfully, length: ${cookieHeader.length} characters\n`
  );

  // Print only the cookie header string to stdout for env var capture
  process.stdout.write(cookieHeader);
}

getAdminCookie();
