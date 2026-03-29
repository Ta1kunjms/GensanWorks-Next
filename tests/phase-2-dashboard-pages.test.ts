import assert from "node:assert/strict";
import { describe, it } from "node:test";

const baseUrl = process.env.PHASE2_BASE_URL;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE2_BASE_URL is not set");
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error("Phase 2 page smoke server is unreachable");
  }
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

describe("phase-2 dashboard page loading", () => {
  runOrSkip("/admin/dashboard redirects anonymous user to login", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 page smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/admin/dashboard`, { redirect: "manual" });
    assert.equal(isRedirect(res.status), true);
    assert.ok((res.headers.get("location") ?? "").includes("/login?role=admin"));
  });

  runOrSkip("/employer/dashboard redirects anonymous user to login", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 page smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/employer/dashboard`, { redirect: "manual" });
    assert.equal(isRedirect(res.status), true);
    assert.ok((res.headers.get("location") ?? "").includes("/login?role=employer"));
  });

  runOrSkip("/jobseeker/dashboard redirects anonymous user to login", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 page smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/jobseeker/dashboard`, { redirect: "manual" });
    assert.equal(isRedirect(res.status), true);
    assert.ok((res.headers.get("location") ?? "").includes("/login?role=jobseeker"));
  });

  runOrSkip("/login loads successfully", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 2 page smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/login`);
    assert.equal(res.status, 200);
  });
});
