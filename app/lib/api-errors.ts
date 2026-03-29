/**
 * Global API Error Handling & Response Utilities
 * Provides consistent error formatting and response structure across all endpoints
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError, type ZodTypeAny } from "zod";

export enum ErrorCode {
  // 4xx Client Errors
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  RATE_LIMITED = "RATE_LIMITED",
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // 5xx Server Errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Get HTTP status code from error code
 */
export function getStatusCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
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
  };

  return statusMap[code] || 500;
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): ApiError {
  return {
    code,
    message,
    statusCode: getStatusCode(code),
    details,
    requestId,
  };
}

/**
 * Create Zod validation error details
 */
export function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join(".");
    formatted[path] = err.message;
  });

  return formatted;
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, requestId?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(requestId && { requestId }),
    },
    { status: 200 }
  );
}

/**
 * Create a paginated JSON response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  requestId?: string
) {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      ...(requestId && { requestId }),
    },
    { status: 200 }
  );
}

/**
 * Create an error JSON response
 */
export function errorResponse(error: ApiError, requestId?: string) {
  const statusCode = error.statusCode || 500;

  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
      ...(requestId && { requestId }),
    },
    { status: statusCode }
  );
}

/**
 * Validation error response (from Zod)
 */
export function validationErrorResponse(
  zodError: ZodError,
  requestId?: string
) {
  const details = formatZodErrors(zodError);

  return NextResponse.json(
    {
      error: "Validation failed",
      code: ErrorCode.VALIDATION_ERROR,
      details,
      ...(requestId && { requestId }),
    },
    { status: 400 }
  );
}

/**
 * Parse and validate query parameters with Zod schema
 */
export function parseQuery<T>(
  schema: ZodTypeAny,
  queryParams: Record<string, string | string[] | undefined>
): { success: true; data: T } | { success: false; error: ZodError } {
  try {
    const data = schema.parse(queryParams);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Parse and validate JSON body with Zod schema
 */
export async function parseBody<T>(
  schema: ZodTypeAny,
  request: NextRequest
): Promise<{ success: true; data: T } | { success: false; error: ZodError; body?: unknown }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    if (error instanceof SyntaxError) {
      const parseError = new ZodError([
        {
          code: "custom",
          message: "Invalid JSON",
          path: [],
        },
      ]);
      return { success: false, error: parseError };
    }
    throw error;
  }
}

/**
 * Safe database operation wrapper
 * Catches and formats database errors
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(`Database error in ${context}:`, error);

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return {
          success: false,
          error: createApiError(
            ErrorCode.CONFLICT,
            "A record with this data already exists"
          ),
        };
      }

      if (error.message.includes("foreign key")) {
        return {
          success: false,
          error: createApiError(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Invalid reference to related record"
          ),
        };
      }

      if (error.message.includes("not null")) {
        return {
          success: false,
          error: createApiError(
            ErrorCode.UNPROCESSABLE_ENTITY,
            "Required field is missing"
          ),
        };
      }
    }

    return {
      success: false,
      error: createApiError(
        ErrorCode.DATABASE_ERROR,
        "Database operation failed"
      ),
    };
  }
}

/**
 * Rate limit error response
 */
export function rateLimitResponse(
  remaining: number,
  resetInSeconds: number,
  requestId?: string
) {
  return NextResponse.json(
    {
      error: "Too many requests",
      code: ErrorCode.RATE_LIMITED,
      ...(requestId && { requestId }),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(resetInSeconds)),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(resetInSeconds),
      },
    }
  );
}
