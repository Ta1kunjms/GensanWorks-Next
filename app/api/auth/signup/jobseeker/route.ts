import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createPostHandler, ApiHandlerContext } from "@/lib/api-handler";
import { signupJobseekerRequestSchema } from "@/lib/validation-schemas";
import {
  errorResponse,
  createApiError,
  ErrorCode,
  safeDatabaseOperation,
} from "@/lib/api-errors";
import { db } from "@/lib/db";
import { usersTable, employersTable } from "@/db/schema";
import { hashPassword } from "@/lib/utils";
import { z } from "zod";

type SignupJobseekerBody = z.infer<typeof signupJobseekerRequestSchema>;

/**
 * POST /api/auth/signup/jobseeker
 * Register a new jobseeker account
 * Public endpoint (no auth required)
 */
export const POST = createPostHandler<SignupJobseekerBody>(
  async (ctx: ApiHandlerContext, body?: SignupJobseekerBody) => {
    const email = (body?.email || "").toLowerCase().trim();

    // Check if email already exists (across both user types)
    const result = await safeDatabaseOperation(
      async () => {
        const [existingUser, existingEmployer] = await Promise.all([
          db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1),
          db
            .select({ id: employersTable.id })
            .from(employersTable)
            .where(eq(employersTable.email, email))
            .limit(1),
        ]);

        if (existingUser.length > 0 || existingEmployer.length > 0) {
          throw new Error("email_exists");
        }

        // Hash password and create user
        const passwordHash = await hashPassword(body?.password || "");

        const [created] = await db
          .insert(usersTable)
          .values({
            email,
            passwordHash,
            name: `${(body?.firstName || "").trim()} ${(body?.lastName || "").trim()}`.trim(),
            phone: body?.phone ? body.phone.trim() : null,
            birthDate: body?.dateOfBirth ? new Date(body.dateOfBirth) : null,
            isActive: true,
          })
          .returning({
            id: usersTable.id,
            email: usersTable.email,
            name: usersTable.name,
          });

        return created;
      },
      "jobseekerSignup"
    );

    if (!result.success) {
      if (result.error.message === "email_exists") {
        return errorResponse(
          createApiError(ErrorCode.CONFLICT, "Email is already in use"),
          ctx.requestId
        );
      }
      return errorResponse(result.error, ctx.requestId);
    }

    // Return success response with user data
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: result.data,
          message: "Jobseeker account created successfully. Please check your email to verify your account.",
        },
        requestId: ctx.requestId,
      },
      { status: 201 }
    );

    response.headers.set("X-Request-ID", ctx.requestId);
    return response;
  },
  {
    bodySchema: signupJobseekerRequestSchema,
    rateLimitMaxRequests: 10,
  }
);
