import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createPostHandler, ApiHandlerContext } from "@/lib/api-handler";
import { signupEmployerRequestSchema } from "@/lib/validation-schemas";
import {
  errorResponse,
  createApiError,
  ErrorCode,
  safeDatabaseOperation,
} from "@/lib/api-errors";
import { db } from "@/lib/db";
import { employersTable, usersTable } from "@/db/schema";
import { hashPassword } from "@/lib/utils";
import { z } from "zod";

type SignupEmployerBody = z.infer<typeof signupEmployerRequestSchema>;

/**
 * POST /api/auth/signup/employer
 * Register a new employer account
 * Public endpoint (no auth required)
 * Account starts in "pending" status and requires admin approval
 */
export const POST = createPostHandler<SignupEmployerBody>(
  async (ctx: ApiHandlerContext, body?: SignupEmployerBody) => {
    const email = (body?.email || "").toLowerCase().trim();

    // Check if email already exists (across both user types)
    const result = await safeDatabaseOperation(
      async () => {
        const [existingEmployer, existingUser] = await Promise.all([
          db
            .select({ id: employersTable.id })
            .from(employersTable)
            .where(eq(employersTable.email, email))
            .limit(1),
          db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1),
        ]);

        if (existingEmployer.length > 0 || existingUser.length > 0) {
          throw new Error("email_exists");
        }

        // Hash password and create employer account
        const passwordHash = await hashPassword(body?.password || "");

        const [created] = await db
          .insert(employersTable)
          .values({
            email,
            passwordHash,
            contactPerson: (body?.contactPerson || "").trim(),
            contactPhone: (body?.contactPhone || "").trim(),
            establishmentName: (body?.establishmentName || "").trim(),
            address: "", // Optional in form but required in database
            city: body?.city ? body.city.trim() : "",
            province: "", // Optional in form but required in database
            industry: body?.industry ? body.industry.trim() : null,
            accountStatus: "pending",
            hasAccount: true,
            isActive: true,
          })
          .returning({
            id: employersTable.id,
            email: employersTable.email,
            contactPerson: employersTable.contactPerson,
            accountStatus: employersTable.accountStatus,
          });

        return created;
      },
      "employerSignup"
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

    // Return success response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          employer: result.data,
          message:
            "Employer account submitted for review. An administrator will review your application and send you a confirmation email within 24-48 hours.",
        },
        requestId: ctx.requestId,
      },
      { status: 201 }
    );

    response.headers.set("X-Request-ID", ctx.requestId);
    return response;
  },
  {
    bodySchema: signupEmployerRequestSchema,
    rateLimitMaxRequests: 8,
  }
);
