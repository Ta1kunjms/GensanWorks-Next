import { NextResponse } from "next/server";
import { createPostHandler, ApiHandlerContext } from "@/lib/api-handler";
import { signupEmployerRequestSchema } from "@/lib/validation-schemas";
import {
  errorResponse,
  createApiError,
  ErrorCode,
  safeDatabaseOperation,
} from "@/lib/api-errors";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/utils";
import { z } from "zod";

type SignupEmployerBody = z.infer<typeof signupEmployerRequestSchema>;

export const POST = createPostHandler<SignupEmployerBody>(
  async (ctx: ApiHandlerContext, body?: SignupEmployerBody) => {
    const email = (body?.email || "").toLowerCase().trim();
    const establishmentName = (body?.establishmentName || "").trim();
    const contactPerson = (body?.contactPerson || establishmentName).trim();
    const contactPhone = (body?.contactPhone || "").trim();

    const result = await safeDatabaseOperation(
      async () => {
        const [existingEmployer, existingUser] = await Promise.all([
          supabaseAdmin
            .from("employers")
            .select("id")
            .eq("email", email)
            .maybeSingle(),
          supabaseAdmin
            .from("jobseekers")
            .select("id")
            .eq("email", email)
            .single(),
        ]);

        if (existingEmployer.data || existingUser.data) {
          throw new Error("email_exists");
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: body?.password || "",
          user_metadata: {
            role: "employer",
            contact_person: contactPerson,
            establishment_name: establishmentName,
            full_name: contactPerson,
            name: contactPerson,
            first_name: contactPerson.split(' ')[0] || "",
            last_name: contactPerson.split(' ').slice(1).join(' ') || "",
          },
          email_confirm: true,
        });

        if (authError || !authUser.user) {
          throw authError ?? new Error("auth_creation_failed");
        }

        return {
          id: authUser.user.id,
          email: authUser.user.email,
          contact_person: contactPerson,
          account_status: "pending",
        };
      },
      "employerSignup"
    );

    if (!result.success) {
      return errorResponse(result.error, ctx.requestId);
    }

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