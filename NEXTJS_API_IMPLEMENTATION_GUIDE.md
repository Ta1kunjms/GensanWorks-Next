# NextJS API Implementation Guide

This guide provides reusable patterns and helper functions for implementing the 127+ API endpoints in Next.js.

---

## Table of Contents
1. [Response Formatting](#response-formatting)
2. [Error Handling](#error-handling)
3. [Authentication & Authorization](#authentication--authorization)
4. [Input Validation](#input-validation)
5. [Database Query Patterns](#database-query-patterns)
6. [Pagination & Sorting](#pagination--sorting)
7. [File Upload Handling](#file-upload-handling)
8. [Data Export (CSV/JSON)](#data-export-csvjson)
9. [Real-time Features (SSE/WebSocket)](#real-time-features-sewebsocket)
10. [Common Endpoint Patterns](#common-endpoint-patterns)

---

## Response Formatting

### Standard Success Response

```typescript
// lib/api/response.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function successResponse<T>(data: T, message?: string): Response {
  return Response.json({
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
    },
  });
}

export function paginatedResponse<T extends any[]>(
  data: T,
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): Response {
  const pages = Math.ceil(pagination.total / pagination.limit);
  return Response.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages,
      hasNext: pagination.page < pages,
      hasPrev: pagination.page > 1,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
    },
  });
}
```

---

## Error Handling

### Standardized Error Responses

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(400, message, "VALIDATION_ERROR");
    this.errors = errors;
  }
  errors?: Record<string, string[]>;
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(403, message, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export function errorResponse(error: ApiError): Response {
  const statusCode = error.statusCode;
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    },
  };

  if (error instanceof ValidationError && error.errors) {
    response.error.details = error.errors;
  }

  return Response.json(response, { status: statusCode });
}

export function handleApiError(error: unknown): Response {
  console.error("API Error:", error);

  if (error instanceof ApiError) {
    return errorResponse(error);
  }

  if (error instanceof ZodError) {
    const fieldErrors = error.fieldErrors;
    return errorResponse(
      new ValidationError("Request validation failed", fieldErrors)
    );
  }

  // Generic error
  return Response.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        timestamp: new Date().toISOString(),
      },
    },
    { status: 500 }
  );
}
```

### Error Middleware Wrapper

```typescript
// lib/api/withErrorHandling.ts
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function withErrorHandlingPOST(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Usage in route handler
export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const data = requestSchema.parse(body);
  // ... rest of handler
});
```

---

## Authentication & Authorization

### Auth Middleware

```typescript
// lib/middleware/auth.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: "admin" | "employer" | "jobseeker";
    name?: string;
    verified?: boolean;
  };
  expires: string;
}

export async function requireAuth(
  req: Request,
  options?: {
    roles?: string[];
  }
): Promise<AuthSession> {
  const session = (await getServerSession(authOptions)) as AuthSession | null;

  if (!session) {
    throw new AuthenticationError("Authentication required");
  }

  if (options?.roles && !options.roles.includes(session.user.role)) {
    throw new AuthorizationError("Insufficient permissions");
  }

  return session;
}

// Role-based guards
export async function requireAdmin(req: Request): Promise<AuthSession> {
  return requireAuth(req, { roles: ["admin"] });
}

export async function requireEmployer(req: Request): Promise<AuthSession> {
  return requireAuth(req, { roles: ["employer"] });
}

export async function requireJobseeker(req: Request): Promise<AuthSession> {
  return requireAuth(req, { roles: ["jobseeker"] });
}

export async function requireAdminOrEmployer(req: Request): Promise<AuthSession> {
  return requireAuth(req, { roles: ["admin", "employer"] });
}

// Optional auth (returns session or null)
export async function getAuthSession(req: Request): Promise<AuthSession | null> {
  return getServerSession(authOptions) as Promise<AuthSession | null>;
}
```

### Usage in Route Handler

```typescript
// app/api/jobs/route.ts
import { requireAuth } from "@/lib/middleware/auth";
import { successResponse, paginatedResponse } from "@/lib/api/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Optional auth - if user is logged in, show published + their own drafts
  const session = await getAuthSession(req);

  const whereCondition: any = { isPublished: true };
  if (session?.user.role === "employer") {
    whereCondition.OR = [
      { isPublished: true },
      { employerId: session.user.id, status: { in: ["draft", "pending"] } },
    ];
  }

  const [jobs, total] = await Promise.all([
    db.query.jobsTable.findMany({
      where: whereCondition,
      limit,
      offset: (page - 1) * limit,
    }),
    db.query.jobsTable.count({ where: whereCondition }),
  ]);

  return paginatedResponse(jobs, { page, limit, total });
}

export async function POST(req: Request) {
  // Admin-only endpoint
  const session = await requireAdmin(req);

  const body = await req.json();
  const validated = insertJobSchema.parse(body);

  const job = await db.insert(jobsTable).values(validated).returning();

  return successResponse(job, "Job created successfully");
}
```

---

## Input Validation

### Zod Schema Examples

```typescript
// lib/validation/schemas.ts
import { z } from "zod";

// Auth schemas
export const signupJobseekerSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, "Must contain uppercase"),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,}$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "employer", "jobseeker"]).optional(),
});

// Job schemas
export const createJobSchema = z.object({
  positionTitle: z.string().min(3).max(255),
  description: z.string().min(20),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  location: z.string().min(3),
  city: z.string().min(2),
  province: z.string().min(2),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Temporary"]),
  vacancies: z.number().int().positive().default(1),
  requiredSkills: z.array(z.string()).optional(),
  isRemote: z.boolean().default(false),
});

export const updateJobSchema = createJobSchema.partial();

// Search/filter schemas
export const jobFiltersSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  employmentType: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  isRemote: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type SignupJobseeker = z.infer<typeof signupJobseekerSchema>;
export type Login = z.infer<typeof loginSchema>;
export type CreateJob = z.infer<typeof createJobSchema>;
export type JobFilters = z.infer<typeof jobFiltersSchema>;
```

### Validation Utility

```typescript
// lib/api/validation.ts
import { ZodSchema } from "zod";
import { ValidationError } from "./errors";

export async function validateRequest<T extends ZodSchema>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = error.fieldErrors;
      throw new ValidationError("Invalid request body", fieldErrors);
    }
    throw error;
  }
}

export function validateQuery<T extends ZodSchema>(
  url: URL,
  schema: T
): z.infer<T> {
  try {
    const params = Object.fromEntries(url.searchParams);
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid query parameters", error.fieldErrors);
    }
    throw error;
  }
}

// Usage in route
export async function POST(req: Request) {
  const data = await validateRequest(req, createJobSchema);
  // data is now fully typed and validated
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = validateQuery(
    new URL(`http://localhost?${searchParams}`),
    jobFiltersSchema
  );
  // filters is now fully typed and validated
}
```

---

## Database Query Patterns

### Insert Operation

```typescript
// app/api/jobs/route.ts
import { db } from "@/db";
import { jobsTable } from "@/db/schema";

export async function POST(req: Request) {
  const session = await requireAdmin(req);
  const validated = await validateRequest(req, insertJobSchema);

  // Single insert
  const [job] = await db
    .insert(jobsTable)
    .values({
      ...validated,
      employerId: validated.employerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return successResponse(job, "Job created");

  // Batch insert
  const jobs = await db
    .insert(jobsTable)
    .values(validatedArray)
    .returning();

  return successResponse(jobs, "Jobs created");
}
```

### Select Operations

```typescript
// Select with filters and pagination
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = validateQuery(
    new URL(`http://localhost?${searchParams}`),
    jobFiltersSchema
  );

  const whereConditions: any = {};

  if (filters.city) whereConditions.city = filters.city;
  if (filters.employmentType) whereConditions.employmentType = filters.employmentType;
  if (filters.search) {
    whereConditions.OR = [
      { positionTitle: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }

  const [jobs, total] = await Promise.all([
    db.query.jobsTable.findMany({
      where: whereConditions,
      limit: filters.limit,
      offset: (filters.page - 1) * filters.limit,
      orderBy: desc(jobsTable.createdAt),
    }),
    db.query.jobsTable.count({ where: whereConditions }),
  ]);

  return paginatedResponse(jobs, { page: filters.page, limit: filters.limit, total });
}

// Select single with relation
export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const job = await db.query.jobsTable.findFirst({
    where: { id: params.jobId },
    with: {
      employer: true,
      applications: { limit: 10 },
    },
  });

  if (!job) throw new NotFoundError("Job");

  return successResponse(job);
}
```

### Update Operations

```typescript
export async function PUT(req: Request, { params }: { params: { jobId: string } }) {
  const session = await requireAdmin(req);
  const validated = await validateRequest(req, updateJobSchema);

  const [updated] = await db
    .update(jobsTable)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(jobsTable.id, params.jobId))
    .returning();

  if (!updated) throw new NotFoundError("Job");

  return successResponse(updated, "Job updated");
}
```

### Delete Operations

```typescript
export async function DELETE(req: Request, { params }: { params: { jobId: string } }) {
  const session = await requireAdmin(req);

  const [deleted] = await db
    .delete(jobsTable)
    .where(eq(jobsTable.id, params.jobId))
    .returning();

  if (!deleted) throw new NotFoundError("Job");

  return successResponse({ id: deleted.id }, "Job deleted");
}
```

### Transaction Example

```typescript
export async function POST(req: Request) {
  const session = await requireEmployer(req);
  const validated = await validateRequest(req, applyJobSchema);

  // Multi-step operation in transaction
  const [application, referral] = await db.transaction(async (tx) => {
    // 1. Create application
    const [app] = await tx
      .insert(applicationsTable)
      .values({
        jobId: validated.jobId,
        applicantId: session.user.id,
        employerId: validated.employerId,
        status: "pending",
      })
      .returning();

    // 2. Create referral
    const [ref] = await tx
      .insert(referralsTable)
      .values({
        applicationId: app.id,
        applicantId: session.user.id,
        jobId: validated.jobId,
        employerId: validated.employerId,
        status: "Pending",
      })
      .returning();

    return [app, ref];
  });

  return successResponse({ application, referral });
}
```

---

## Pagination & Sorting

### Pagination Helper

```typescript
// lib/db/pagination.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export function getPaginationParams(url: URL): PaginationParams {
  return {
    page: Math.max(1, parseInt(url.searchParams.get("page") || "1")),
    limit: Math.min(100, parseInt(url.searchParams.get("limit") || "20")),
    sort: url.searchParams.get("sort") || undefined,
    order: (url.searchParams.get("order") as any) || "desc",
  };
}

export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function getTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

// Usage
export async function GET(req: Request) {
  const { page, limit, sort, order } = getPaginationParams(new URL(req.url));
  const offset = getPaginationOffset(page, limit);

  const [data, total] = await Promise.all([
    db.query.jobsTable.findMany({
      limit,
      offset,
      orderBy: sort ? [sql`${sql.identifier(sort)} ${order === "asc" ? asc(sql.identifier(sort)) : desc(sql.identifier(sort))}`] : [],
    }),
    db.query.jobsTable.count(),
  ]);

  return paginatedResponse(data, { page, limit, total });
}
```

---

## File Upload Handling

### Multipart File Upload

```typescript
// lib/upload/handler.ts
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function handleFileUpload(
  req: Request,
  fieldName: string,
  options?: {
    allowed: string[];
    maxSize: number;
    directory: string;
  }
) {
  const formData = await req.formData();
  const file = formData.get(fieldName) as File;

  if (!file) throw new ValidationError("File is required");

  // Validate file type
  if (options?.allowed && !options.allowed.includes(file.type)) {
    throw new ValidationError(`File type not allowed: ${file.type}`);
  }

  // Validate file size
  if (options?.maxSize && file.size > options.maxSize) {
    throw new ValidationError(
      `File too large. Max size: ${options.maxSize / 1024 / 1024}MB`
    );
  }

  // Generate unique filename
  const filename = `${uuidv4()}-${file.name}`;
  const directory = options?.directory || "public/uploads";
  const filepath = join(process.cwd(), directory, filename);

  // Create directory if not exists
  await mkdir(join(process.cwd(), directory), { recursive: true });

  // Save file
  const buffer = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(buffer));

  return {
    filename,
    url: `/${directory}/${filename}`,
    size: file.size,
    type: file.type,
  };
}

// Usage in route
export async function POST(req: Request) {
  const session = await requireJobseeker(req);

  const file = await handleFileUpload(req, "resume", {
    allowed: ["application/pdf", "application/msword"],
    maxSize: 5 * 1024 * 1024, // 5MB
    directory: "public/uploads/resumes",
  });

  // Save URL to database
  await db
    .update(usersTable)
    .set({ resumeUrl: file.url })
    .where(eq(usersTable.id, session.user.id));

  return successResponse(file);
}
```

---

## Data Export (CSV/JSON)

### Export Utilities

```typescript
// lib/export/formatter.ts
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns?: (keyof T)[]
): string {
  if (data.length === 0) return "";

  const keys = columns || Object.keys(data[0]);
  const header = keys.join(",");

  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return "";
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === "object") return `"${JSON.stringify(value)}"`;
        return value;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

export function downloadResponse(
  data: string,
  filename: string,
  mimeType: string = "text/csv"
): Response {
  return new Response(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Usage in route
export async function GET(req: Request) {
  const session = await requireAdmin(req);
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const applicants = await db.query.usersTable.findMany({
    where: { role: "jobseeker" },
  });

  if (format === "csv") {
    const csv = toCSV(applicants, ["id", "firstName", "lastName", "email"]);
    return downloadResponse(csv, "applicants.csv");
  }

  const json = JSON.stringify(applicants, null, 2);
  return downloadResponse(json, "applicants.json", "application/json");
}
```

---

## Real-time Features (SSE/WebSocket)

### Server-Sent Events (SSE) Implementation

```typescript
// app/api/notifications/stream/route.ts
export async function GET(req: Request) {
  const session = await requireAuth(req);

  const controller = new ReadableStreamDefaultController();
  const encoder = new TextEncoder();

  const stream = new ReadableStream((controller) => {
    // Send initial connection message
    controller.enqueue(encoder.encode("data: connected\n\n"));

    // Simulate notification polling
    const interval = setInterval(async () => {
      try {
        const notifications = await db.query.notificationsTable.findMany({
          where: { userId: session.user.id, read: false },
          limit: 10,
        });

        if (notifications.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ notifications })}\n\n`)
          );
        }
      } catch (error) {
        console.error("SSE error:", error);
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup on client disconnect
    return () => {
      clearInterval(interval);
    };
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Client-side SSE Consumer

```typescript
// lib/notifications/useNotificationStream.ts
export function useNotificationStream(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications(data.notifications);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [userId]);

  return notifications;
}
```

---

## Common Endpoint Patterns

### Pattern 1: Read-Only List Endpoint

```typescript
// app/api/jobs/route.ts (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { page, limit, sort, order } = getPaginationParams(new URL(req.url));

  const whereConditions: any = { isPublished: true };

  if (searchParams.has("city")) {
    whereConditions.city = searchParams.get("city");
  }

  const [jobs, total] = await Promise.all([
    db.query.jobsTable.findMany({
      where: whereConditions,
      limit,
      offset: (page - 1) * limit,
      orderBy: ..., // sorting
    }),
    db.query.jobsTable.count({ where: whereConditions }),
  ]);

  return paginatedResponse(jobs, { page, limit, total });
}
```

### Pattern 2: Create with Validation

```typescript
// app/api/jobs/route.ts (POST)
export async function POST(req: Request) {
  const session = await requireAdmin(req);
  const validated = await validateRequest(req, insertJobSchema);

  const [job] = await db
    .insert(jobsTable)
    .values({ ...validated, createdAt: new Date() })
    .returning();

  return successResponse(job, "Job created", { status: 201 });
}
```

### Pattern 3: Update with Partial Data

```typescript
// app/api/jobs/[jobId]/route.ts (PUT)
export async function PUT(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await requireAdmin(req);
  const validated = await validateRequest(req, updateJobSchema);

  const existing = await db.query.jobsTable.findFirst({
    where: { id: params.jobId },
  });

  if (!existing) throw new NotFoundError("Job");

  const [updated] = await db
    .update(jobsTable)
    .set({ ...validated, updatedAt: new Date() })
    .where(eq(jobsTable.id, params.jobId))
    .returning();

  return successResponse(updated);
}
```

### Pattern 4: Delete with Cascade

```typescript
// app/api/jobs/[jobId]/route.ts (DELETE)
export async function DELETE(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await requireAdmin(req);

  await db.transaction(async (tx) => {
    // Delete related applications first
    await tx.delete(applicationsTable).where(eq(applicationsTable.jobId, params.jobId));

    // Delete related referrals
    await tx.delete(referralsTable).where(eq(referralsTable.jobId, params.jobId));

    // Delete job
    await tx.delete(jobsTable).where(eq(jobsTable.id, params.jobId));
  });

  return successResponse({ id: params.jobId });
}
```

### Pattern 5: Status Transition with Validation

```typescript
// app/api/jobs/[jobId]/status/route.ts (PATCH)
export async function PATCH(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await requireAdmin(req);
  const { status } = await validateRequest(req, z.object({ status: z.enum(["draft", "pending", "active", "closed"]) }));

  const job = await db.query.jobsTable.findFirst({
    where: { id: params.jobId },
  });

  if (!job) throw new NotFoundError("Job");

  // Validate transition 
  const validTransitions: Record<string, string[]> = {
    draft: ["pending"],
    pending: ["active", "draft"],
    active: ["closed"],
    closed: [],
  };

  if (!validTransitions[job.status]?.includes(status)) {
    throw new ValidationError(
      `Cannot transition from ${job.status} to ${status}`
    );
  }

  const [updated] = await db
    .update(jobsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobsTable.id, params.jobId))
    .returning();

  return successResponse(updated);
}
```

### Pattern 6: Nested Resource CRUD

```typescript
// app/api/employers/[employerId]/jobs/route.ts (GET)
export async function GET(
  req: Request,
  { params }: { params: { employerId: string } }
) {
  const session = await requireAuth(req, { roles: ["admin", "employer"] });

  const { page, limit } = getPaginationParams(new URL(req.url));

  const [jobs, total] = await Promise.all([
    db.query.jobsTable.findMany({
      where: { employerId: params.employerId },
      limit,
      offset: (page - 1) * limit,
    }),
    db.query.jobsTable.count({ where: { employerId: params.employerId } }),
  ]);

  return paginatedResponse(jobs, { page, limit, total });
}

// app/api/employers/[employerId]/jobs/[jobId]/route.ts (PUT - employer-scoped)
export async function PUT(
  req: Request,
  { params }: { params: { employerId: string; jobId: string } }
) {
  const session = await requireEmployer(req);

  // Verify employer ownership
  const job = await db.query.jobsTable.findFirst({
    where: { id: params.jobId, employerId: params.employerId },
  });

  if (!job) throw new NotFoundError("Job");

  const validated = await validateRequest(req, updateJobSchema);

  const [updated] = await db
    .update(jobsTable)
    .set({ ...validated, updatedAt: new Date() })
    .where(eq(jobsTable.id, params.jobId))
    .returning();

  return successResponse(updated);
}
```

---

## Best Practices Summary

✅ **Always**
- Validate input with Zod schemas
- Check authentication/authorization
- Use consistent response format
- Handle errors gracefully
- Use transactions for multi-step ops
- Return appropriate HTTP status codes
- Log important operations
- Paginate large result sets

❌ **Never**
- Trust user input without validation
- Expose sensitive data in responses
- Perform N+1 queries
- Use raw SQL (use ORM only)
- Return generic error messages in production
- Forget to handle edge cases
- Mix success and error responses
- Perform expensive operations on GET

---

**Next:** Implement Phase 1 foundation components based on these patterns
