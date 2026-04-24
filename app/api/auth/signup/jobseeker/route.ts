import { NextResponse } from "next/server";
import { createPostHandler, ApiHandlerContext } from "@/lib/api-handler";
import { signupJobseekerRequestSchema } from "@/lib/validation-schemas";
import {
  errorResponse,
  createApiError,
  ErrorCode,
  safeDatabaseOperation,
} from "@/lib/api-errors";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/utils";
import { z } from "zod";

type SignupJobseekerBody = z.infer<typeof signupJobseekerRequestSchema>;

export const POST = createPostHandler<SignupJobseekerBody>(
  async (ctx: ApiHandlerContext, body?: SignupJobseekerBody) => {
    const email = (body?.email || "").toLowerCase().trim();

    const result = await safeDatabaseOperation(
      async () => {
        const [existingUser, existingEmployer] = await Promise.all([
          supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single(),
          supabaseAdmin
            .from("employers")
            .select("id")
            .eq("email", email)
            .single(),
        ]);

        if (existingUser.data || existingEmployer.data) {
          throw new Error("email_exists");
        }

        const passwordHash = await hashPassword(body?.password || "");

        const inserted = await supabaseAdmin
          .from("users")
          .insert({
            email,
            password_hash: passwordHash,
            name: `${(body?.firstName || "").trim()} ${(body?.lastName || "").trim()}`.trim(),
            phone: body?.phone ? body.phone.trim() : null,
            birth_date: body?.dateOfBirth ? new Date(body.dateOfBirth).toISOString() : null,
            is_active: true,
          })
          .select("id, email, name")
          .single();

        if (inserted.error || !inserted.data) {
          throw inserted.error ?? new Error("insert_failed");
        }

        return inserted.data;
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