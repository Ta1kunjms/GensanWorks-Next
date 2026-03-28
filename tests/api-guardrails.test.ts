import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
  parseBoundedInt,
} from "@/lib/api-guardrails";

describe("api-guardrails", () => {
  it("clamps bounded ints within min/max", () => {
    assert.equal(parseBoundedInt("999", { fallback: 10, min: 1, max: 100 }), 100);
    assert.equal(parseBoundedInt("-2", { fallback: 10, min: 1, max: 100 }), 1);
    assert.equal(parseBoundedInt("abc", { fallback: 10, min: 1, max: 100 }), 10);
  });

  it("enforces rate limit window", () => {
    const key = `test-rate-${Date.now()}`;
    const first = enforceRateLimit({ key, maxRequests: 2, windowMs: 60_000 });
    const second = enforceRateLimit({ key, maxRequests: 2, windowMs: 60_000 });
    const third = enforceRateLimit({ key, maxRequests: 2, windowMs: 60_000 });

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
  });

  it("uses x-request-id when provided", () => {
    const req = new Request("http://localhost/api", {
      headers: { "x-request-id": "custom-request-id-123" },
    });

    assert.equal(getRequestId(req), "custom-request-id-123");
  });

  it("extracts client ip from forwarded headers", () => {
    const req = new Request("http://localhost/api", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 70.41.3.18, 150.172.238.178",
      },
    });

    assert.equal(getClientIp(req), "203.0.113.10");
  });

  it("returns unknown client ip when no headers are present", () => {
    const req = new Request("http://localhost/api");
    assert.equal(getClientIp(req), "unknown");
  });
});
