#!/usr/bin/env node
/*
  Lightweight auth smoke checks for local/dev environments.

  Usage:
    node scripts/auth-smoke-check.js

  Optional:
    BASE_URL=http://localhost:3000
*/
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name} -> ${err.message || err}`);
    process.exitCode = 1;
  }
}

(async () => {
  await check("/api/auth/session returns 200", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`);
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  });

  await check("/admin/dashboard redirects to role login when unauthenticated", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
    if (res.status !== 307 && res.status !== 302) {
      throw new Error(`expected redirect 302/307, got ${res.status}`);
    }
    const location = res.headers.get("location") || "";
    if (!location.includes("/login?role=admin")) {
      throw new Error(`unexpected location header: ${location}`);
    }
  });

  await check("/sw.js is available", async () => {
    const res = await fetch(`${BASE_URL}/sw.js`);
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  });

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
  console.log("Auth smoke checks completed.");
})();
