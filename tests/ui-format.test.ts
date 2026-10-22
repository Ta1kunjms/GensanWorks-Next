// Display formatters for the UI cleanup (app/lib/utils.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCount, formatPeso } from "../app/lib/utils";

describe("formatCount", () => {
  it("shows an em dash for missing or invalid values", () => {
    assert.equal(formatCount(null), "—");
    assert.equal(formatCount(undefined), "—");
    assert.equal(formatCount(Number.NaN), "—");
    assert.equal(formatCount(Number.POSITIVE_INFINITY), "—");
    assert.equal(formatCount(Number.NEGATIVE_INFINITY), "—");
  });

  it("keeps zero as a real value and never shows -0", () => {
    assert.equal(formatCount(0), "0");
    assert.equal(formatCount(-0), "0");
  });

  it("groups thousands for en-PH", () => {
    assert.equal(formatCount(1234), "1,234");
    assert.equal(formatCount(1234567), "1,234,567");
  });

  it("keeps the sign of negative values", () => {
    assert.equal(formatCount(-1234), "-1,234");
  });
});

describe("formatPeso", () => {
  it("shows an em dash for missing values", () => {
    assert.equal(formatPeso(null), "—");
    assert.equal(formatPeso(undefined), "—");
    assert.equal(formatPeso(Number.NaN), "—");
    assert.equal(formatPeso(Number.POSITIVE_INFINITY), "—");
    assert.equal(formatPeso(Number.NEGATIVE_INFINITY), "—");
  });

  it("formats pesos with the peso sign and centavos", () => {
    assert.equal(formatPeso(0), "₱0.00");
    assert.equal(formatPeso(-0), "₱0.00");
    assert.equal(formatPeso(1234), "₱1,234.00");
  });

  it("formats negative amounts", () => {
    assert.equal(formatPeso(-1234), "-₱1,234.00");
  });

  it("supports compact notation", () => {
    assert.equal(formatPeso(1234567, { compact: true }), "₱1.2M");
  });
});
