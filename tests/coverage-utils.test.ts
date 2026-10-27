// Offline unit tests for shared formatting and password helpers in app/lib/utils.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capitalizeString,
  cn,
  formatDate,
  formatDatetime,
  hashPassword,
  slugify,
  verifyPassword,
} from "../app/lib/utils";

describe("utils", () => {
  it("merges class names, later Tailwind classes winning", () => {
    assert.equal(cn("p-2", "p-4"), "p-4");
    assert.equal(cn("text-sm", false && "hidden", undefined, "font-medium"), "text-sm font-medium");
  });

  it("formats dates and handles missing values", () => {
    assert.equal(formatDate(null), "");
    assert.equal(formatDatetime(undefined), "");
    assert.match(formatDate("2026-03-05T12:00:00Z"), /Mar \d{1,2}, 2026/);
    assert.match(formatDatetime(new Date("2026-03-05T12:00:00Z")), /Mar \d{1,2}, 2026/);
  });

  it("capitalizes words and builds slugs", () => {
    assert.equal(capitalizeString("fish processing worker"), "Fish Processing Worker");
    assert.equal(slugify("  Sales  &  Marketing Lead!"), "-sales-marketing-lead");
    assert.equal(slugify("Food Safety"), "food-safety");
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct horse");
    assert.notEqual(hash, "correct horse");
    assert.equal(await verifyPassword("correct horse", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });
});
