import { errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";

// This endpoint previously ran privileged, unauthenticated database DDL.
// It has been permanently disabled and intentionally returns a generic
// 404 for every request. See tests/admin-fix-db-route-disabled.test.ts.
export async function GET() {
  return errorResponse(createApiError(ErrorCode.NOT_FOUND, "Not found"));
}
