// Offline unit tests for the shared API error/response helpers.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ErrorCode,
  createApiError,
  errorResponse,
  formatZodErrors,
  getStatusCode,
  paginatedResponse,
  parseBody,
  parseQuery,
  rateLimitResponse,
  safeDatabaseOperation,
  successResponse,
  validationErrorResponse,
} from "../app/lib/api-errors";

const quiet = async <T>(fn: () => Promise<T> | T): Promise<T> => {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
};

const schema = z.object({ name: z.string().min(2), age: z.coerce.number().int() });

describe("api-errors status mapping", () => {
  it("maps every error code to its HTTP status", () => {
    const expected: Record<ErrorCode, number> = {
      [ErrorCode.BAD_REQUEST]: 400,
      [ErrorCode.UNAUTHORIZED]: 401,
      [ErrorCode.FORBIDDEN]: 403,
      [ErrorCode.NOT_FOUND]: 404,
      [ErrorCode.CONFLICT]: 409,
      [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
      [ErrorCode.RATE_LIMITED]: 429,
      [ErrorCode.VALIDATION_ERROR]: 400,
      [ErrorCode.INTERNAL_ERROR]: 500,
      [ErrorCode.NOT_IMPLEMENTED]: 501,
      [ErrorCode.SERVICE_UNAVAILABLE]: 503,
      [ErrorCode.DATABASE_ERROR]: 500,
      [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
      [ErrorCode.INVALID_CREDENTIALS]: 401,
      [ErrorCode.EMAIL_NOT_VERIFIED]: 403,
      [ErrorCode.PROFILE_INCOMPLETE]: 403,
    };
    for (const [code, status] of Object.entries(expected)) {
      assert.equal(getStatusCode(code as ErrorCode), status, code);
    }
    assert.equal(getStatusCode("UNKNOWN" as ErrorCode), 500);
  });

  it("creates errors with a friendly message fallback", () => {
    const plain = createApiError(ErrorCode.NOT_FOUND, "Job not found");
    assert.equal(plain.statusCode, 404);
    assert.equal(plain.userFriendlyMessage, "Job not found");
    const full = createApiError(ErrorCode.CONFLICT, "dup", "Already exists", { field: "email" }, "req-1");
    assert.deepEqual(full, {
      code: ErrorCode.CONFLICT,
      message: "dup",
      userFriendlyMessage: "Already exists",
      statusCode: 409,
      details: { field: "email" },
      requestId: "req-1",
    });
  });
});

describe("api-errors responses", () => {
  it("builds success and paginated responses", async () => {
    const ok = successResponse({ id: 1 }, "req-2");
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { success: true, data: { id: 1 }, requestId: "req-2" });
    assert.deepEqual(await successResponse([]).json(), { success: true, data: [] });

    const page = await paginatedResponse([1, 2], 5, 2, 2).json();
    assert.deepEqual(page.pagination, { total: 5, limit: 2, offset: 2, hasMore: true });
    const last = await paginatedResponse([5], 5, 2, 4, "req-3").json();
    assert.equal(last.pagination.hasMore, false);
    assert.equal(last.requestId, "req-3");
  });

  it("builds error, validation and rate-limit responses", async () => {
    const err = errorResponse(createApiError(ErrorCode.FORBIDDEN, "no", "Not allowed", { role: "jobseeker" }), "req-4");
    assert.equal(err.status, 403);
    assert.deepEqual(await err.json(), {
      error: "no",
      message: "Not allowed",
      code: ErrorCode.FORBIDDEN,
      details: { role: "jobseeker" },
      requestId: "req-4",
    });
    const noStatus = errorResponse({ code: ErrorCode.INTERNAL_ERROR, message: "x", statusCode: 0 });
    assert.equal(noStatus.status, 500);

    const parsed = schema.safeParse({ name: "a", age: "x" });
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      const details = formatZodErrors(parsed.error);
      assert.ok(details.name && details.age);
      const res = await quiet(() => validationErrorResponse(parsed.error, "req-5"));
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.code, ErrorCode.VALIDATION_ERROR);
      assert.deepEqual(body.details, details);
    }

    const limited = rateLimitResponse(0, 12.4, "req-6");
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("Retry-After"), "13");
    assert.equal(limited.headers.get("X-RateLimit-Remaining"), "0");
  });
});

describe("api-errors parsing", () => {
  it("parses query parameters", () => {
    const good = parseQuery<{ name: string; age: number }>(schema, { name: "Ana", age: "30" });
    assert.deepEqual(good, { success: true, data: { name: "Ana", age: 30 } });
    const bad = parseQuery(schema, { name: "A" });
    assert.equal(bad.success, false);
    const throwing = z.any().transform(() => {
      throw new TypeError("boom");
    });
    assert.throws(() => parseQuery(throwing, {} as never), TypeError);
  });

  it("parses JSON bodies and reports invalid JSON", async () => {
    const req = (body: string) =>
      new NextRequest("http://localhost/api/x", { method: "POST", body, headers: { "content-type": "application/json" } });

    assert.deepEqual(await parseBody(schema, req('{"name":"Ana","age":3}')), { success: true, data: { name: "Ana", age: 3 } });
    const invalid = await parseBody(schema, req('{"name":"A","age":3}'));
    assert.equal(invalid.success, false);
    const broken = await parseBody(schema, req("{not json"));
    assert.equal(broken.success, false);
    if (!broken.success) assert.equal(broken.error.errors[0]!.message, "Invalid JSON");
  });
});

describe("safeDatabaseOperation", () => {
  const fail = (err: Record<string, string>) => quiet(() => safeDatabaseOperation(async () => { throw err; }, "test"));

  it("returns data on success", async () => {
    assert.deepEqual(await safeDatabaseOperation(async () => 42, "ok"), { success: true, data: 42 });
  });

  it("maps known database errors to safe user messages", async () => {
    const cases: Array<[Record<string, string>, ErrorCode]> = [
      [{ code: "23505" }, ErrorCode.CONFLICT],
      [{ message: "email_exists" }, ErrorCode.CONFLICT],
      [{ message: "auth_creation_failed" }, ErrorCode.INTERNAL_ERROR],
      [{ code: "23503" }, ErrorCode.UNPROCESSABLE_ENTITY],
      [{ code: "23502" }, ErrorCode.BAD_REQUEST],
      [{ message: "timeout" }, ErrorCode.DATABASE_ERROR],
    ];
    for (const [err, code] of cases) {
      const result = await fail(err);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, code);
        assert.ok(result.error.userFriendlyMessage && !result.error.userFriendlyMessage.includes("timeout"));
      }
    }
  });
});
