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
  
  // Specific Business/Auth Errors
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  PROFILE_INCOMPLETE = "PROFILE_INCOMPLETE",
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  userFriendlyMessage?: string;
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
    [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    [ErrorCode.EMAIL_NOT_VERIFIED]: 403,
    [ErrorCode.PROFILE_INCOMPLETE]: 403,
  };

  return statusMap[code] || 500;
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  userFriendlyMessage?: string,
  details?: Record<string, unknown>,
  requestId?: string
): ApiError {
  return {
    code,
    message,
    userFriendlyMessage: userFriendlyMessage || message,
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
      message: error.userFriendlyMessage || error.message,
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
  console.error(`[VALIDATION_ERROR] Request ID: ${requestId}`, details);

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
  } catch (error: any) {
    console.error(`Database error in ${context}:`, error);

    // Map common error patterns
    const message = error.message || "";
    const code = error.code || ""; // Postgres error code

    // Check for specific database errors by message or code
    if (message === "email_exists" || code === "23505") {
      return {
        success: false,
        error: createApiError(
          ErrorCode.CONFLICT,
          "Database conflict: Unique constraint violated",
          "This email or record already exists. Please try a different one."
        ),
      };
    }

    if (message === "auth_creation_failed") {
      return {
        success: false,
        error: createApiError(
          ErrorCode.INTERNAL_ERROR,
          "Auth service error",
          "We're having trouble creating your account. Please try again in a moment."
        ),
      };
    }

    if (code === "23503") { // Foreign key violation
      return {
        success: false,
        error: createApiError(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "Database reference error",
          "We couldn't save this because it refers to something that doesn't exist."
        ),
      };
    }

    if (code === "23502") { // Not null violation
      return {
        success: false,
        error: createApiError(
          ErrorCode.BAD_REQUEST,
          "Missing required information",
          "Please make sure all required fields are filled out."
        ),
      };
    }

    // Default database error
    return {
      success: false,
      error: createApiError(
        ErrorCode.DATABASE_ERROR,
        `Database operation failed: ${message}`,
        "Something went wrong while saving your data. Please try again."
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
