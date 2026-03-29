import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nextConfig from "../next.config";

describe("security configuration", () => {
  it("allows local dev origins used by automated tests", () => {
    const origins = nextConfig.allowedDevOrigins ?? [];

    assert.ok(origins.includes("127.0.0.1"));
    assert.ok(origins.includes("localhost"));
  });

  it("defines expected security headers", async () => {
    const headerFactory = nextConfig.headers;
    assert.ok(typeof headerFactory === "function");

    const entries = await headerFactory();
    assert.ok(Array.isArray(entries));
    assert.ok(entries.length > 0);

    const globalHeaders = entries.find((entry) => entry.source === "/:path*");
    assert.ok(globalHeaders, "Expected global header config for /:path*");

    const headerMap = new Map(
      globalHeaders.headers.map((header) => [header.key.toLowerCase(), header.value])
    );

    assert.equal(headerMap.get("x-content-type-options"), "nosniff");
    assert.equal(headerMap.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(headerMap.get("x-xss-protection"), "1; mode=block");
    assert.equal(headerMap.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(headerMap.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
    assert.equal(headerMap.get("cross-origin-opener-policy"), "same-origin");
    assert.equal(headerMap.get("cross-origin-resource-policy"), "same-site");
    assert.equal(headerMap.get("x-dns-prefetch-control"), "off");
    assert.equal(headerMap.get("x-permitted-cross-domain-policies"), "none");
    const csp = headerMap.get("content-security-policy-report-only") ?? "";
    assert.match(csp, /default-src 'self'/i);
    assert.match(csp, /object-src 'none'/i);

    const hsts = headerMap.get("strict-transport-security") ?? "";
    assert.match(hsts, /max-age=31536000/i);
  });
});
