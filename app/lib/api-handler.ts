/**
 * API Request Handler Wrapper
 * Provides a standardized way to handle API routes with built-in:
 * - Authentication checks
 * - Rate limiting
 * - Request/response validation
 * - Error handling
 * - Request ID tracking
 */

import { NextRequest, NextResponse } from "next/server";

import { ZodSchema } from "zod";
import {
  getRequestId,
  getClientIp,
  enforceRateLimit,
} from "./api-guardrails";
import {
  errorResponse,
  validationErrorResponse,
  parseQuery,
  parseBody,
  createApiError,
  ErrorCode,
  rateLimitResponse,
} from "./api-errors";

export type UserRole = "admin" | "employer" | "jobseeker";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;
  issuedAt?: number;
}

export interface ApiHandlerContext {
  user: AuthenticatedUser | null;
  requestId: string;
  clientIp: string;
  request: NextRequest;
}

/**
 * Options for configuring API handler behavior
 */
export interface ApiHandlerOptions {
  // Authentication
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  requireRecentAuthMinutes?: number;

  // Rate limiting
  enableRateLimit?: boolean;
  rateLimitKey?: string; // Custom rate limit key, defaults to endpoint
  rateLimitMaxRequests?: number; // Default: 60
  rateLimitWindowMs?: number; // Default: 60000 (1 minute)

  // Validation
  querySchema?: ZodSchema;
  bodySchema?: ZodSchema;

  // Logging
  logRequest?: boolean;
  logResponse?: boolean;
}

const DEFAULT_RATE_LIMIT_MAX = 60;
const DEFAULT_RATE_LIMIT_WINDOW = 60000; // 1 minute

import { auth } from "./auth";

/**
 * Extract and validate authentication token
 */
async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();
    if (!session || !session.user) return null;

    return {
      id: session.user.id || "",
      email: session.user.email || "",
      name: session.user.name || "",
      role: (session.user as any).role || "jobseeker",
      image: session.user.image || undefined,
      issuedAt: undefined,
    };
  } catch (error) {
    console.error("Auth token error:", error);
    return null;
  }
}

/**
 * Main API handler wrapper factory
 * Usage:
 * export const GET = createApiHandler(async (ctx) => {
 *   return { success: true, data: [...] };
 * }, { requireAuth: true, allowedRoles: ["employer"] });
 */
export function createApiHandler<TBody = unknown, TQuery = unknown>(
  handler: (ctx: ApiHandlerContext, body?: TBody, query?: TQuery) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    const clientIp = getClientIp(request);

    try {
      // Logging
      if (options.logRequest !== false) {
        console.log(
          `[${requestId}] ${request.method} ${request.nextUrl.pathname} from ${clientIp}`
        );
      }

      // =====================================================================
      // AUTHENTICATION CHECK
      // =====================================================================
      const user = await getAuthenticatedUser(request);

      if (options.requireAuth && !user) {
        return errorResponse(
          createApiError(
            ErrorCode.UNAUTHORIZED,
            "Authentication required"
          ),
          requestId
        );
      }

      if (options.allowedRoles && user && !options.allowedRoles.includes(user.role)) {
        return errorResponse(
          createApiError(
            ErrorCode.FORBIDDEN,
            "Insufficient permissions"
          ),
          requestId
        );
      }

      if (options.requireRecentAuthMinutes && user) {
        const issuedAtMs = user.issuedAt ? user.issuedAt * 1000 : 0;
        const maxAgeMs = options.requireRecentAuthMinutes * 60 * 1000;
        const isStale = issuedAtMs <= 0 || Date.now() - issuedAtMs > maxAgeMs;

        if (isStale) {
          return errorResponse(
            createApiError(
              ErrorCode.UNAUTHORIZED,
              "Recent authentication required"
            ),
            requestId
          );
        }
      }

      // =====================================================================
      // RATE LIMITING
      // =====================================================================
      if (options.enableRateLimit !== false) {
        const rateLimitKey =
          options.rateLimitKey ||
          `${request.method}:${request.nextUrl.pathname}:${clientIp}`;

        const rateLimitResult = enforceRateLimit({
          key: rateLimitKey,
          maxRequests: options.rateLimitMaxRequests ?? DEFAULT_RATE_LIMIT_MAX,
          windowMs: options.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW,
        });

        if (!rateLimitResult.allowed) {
          return rateLimitResponse(
            rateLimitResult.remaining,
            rateLimitResult.resetInSeconds,
            requestId
          );
        }
      }

      // =====================================================================
      // QUERY VALIDATION
      // =====================================================================
      let parsedQuery = {} as TQuery;
      if (options.querySchema) {
        const queryParams = Object.fromEntries(request.nextUrl.searchParams);
        const parseResult = parseQuery(options.querySchema, queryParams);

        if (!parseResult.success) {
          return validationErrorResponse(parseResult.error, requestId);
        }

        parsedQuery = parseResult.data as TQuery;
      }

      // =====================================================================
      // BODY VALIDATION
      // =====================================================================
      let parsedBody: TBody | undefined;
      if (options.bodySchema && ["POST", "PUT", "PATCH"].includes(request.method)) {
        const parseResult = await parseBody(options.bodySchema, request);

        if (!parseResult.success) {
          return validationErrorResponse(parseResult.error, requestId);
        }

        parsedBody = parseResult.data as TBody;
      }

      // =====================================================================
      // EXECUTE HANDLER
      // =====================================================================
      const context: ApiHandlerContext = {
        user,
        requestId,
        clientIp,
        request,
      };

      const response = await handler(context, parsedBody, parsedQuery);

      // Add request ID header to response
      if (response) {
        response.headers.set("X-Request-ID", requestId);
      }

      // Logging
      if (options.logResponse !== false) {
        console.log(
          `[${requestId}] Response: ${response?.status} (${response?.headers.get("content-type")})`
        );
      }

      return response;
    } catch (error) {
      console.error(`[${requestId}] Unhandled error:`, error);

      return errorResponse(
        createApiError(
          ErrorCode.INTERNAL_ERROR,
          "Internal server error"
        ),
        requestId
      );
    }
  };
}

/**
 * GET handler wrapper
 */
export function createGetHandler<TQuery = unknown>(
  handler: (ctx: ApiHandlerContext, query?: TQuery) => Promise<NextResponse>,
  options?: ApiHandlerOptions
) {
  return createApiHandler<unknown, TQuery>(
    async (ctx, _, query) => handler(ctx, query),
    options
  );
}

/**
 * POST handler wrapper
 */
export function createPostHandler<TBody = unknown>(
  handler: (ctx: ApiHandlerContext, body?: TBody) => Promise<NextResponse>,
  options?: ApiHandlerOptions
) {
  return createApiHandler<TBody, unknown>(
    async (ctx, body) => handler(ctx, body),
    options
  );
}

/**
 * PUT handler wrapper
 */
export function createPutHandler<TBody = unknown>(
  handler: (ctx: ApiHandlerContext, body?: TBody) => Promise<NextResponse>,
  options?: ApiHandlerOptions
) {
  return createApiHandler<TBody, unknown>(
    async (ctx, body) => handler(ctx, body),
    options
  );
}

/**
 * PATCH handler wrapper
 */
export function createPatchHandler<TBody = unknown>(
  handler: (ctx: ApiHandlerContext, body?: TBody) => Promise<NextResponse>,
  options?: ApiHandlerOptions
) {
  return createApiHandler<TBody, unknown>(
    async (ctx, body) => handler(ctx, body),
    options
  );
}

/**
 * DELETE handler wrapper
 */
export function createDeleteHandler(
  handler: (ctx: ApiHandlerContext) => Promise<NextResponse>,
  options?: ApiHandlerOptions
) {
  return createApiHandler(
    async (ctx) => handler(ctx),
    options
  );
}
