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
import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy-notice-version";
import { z } from "zod";

type SignupJobseekerBody = z.infer<typeof signupJobseekerRequestSchema>;

export const POST = createPostHandler<SignupJobseekerBody>(
  async (ctx: ApiHandlerContext, body?: SignupJobseekerBody) => {
    const email = (body?.email || "").toLowerCase().trim();

    const result = await safeDatabaseOperation(
      async () => {
        const [existingUser, existingEmployer] = await Promise.all([
          supabaseAdmin
            .from("jobseekers")
            .select("id")
            .eq("email", email)
            .maybeSingle(),
          supabaseAdmin
            .from("employers")
            .select("id")
            .eq("email", email)
            .single(),
        ]);

        if (existingUser.data || existingEmployer.data) {
          throw new Error("email_exists");
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: body?.password || "",
          user_metadata: {
            role: "jobseeker",
            first_name: (body?.firstName || "").trim(),
            last_name: (body?.lastName || "").trim(),
            full_name: `${(body?.firstName || "").trim()} ${(body?.lastName || "").trim()}`.trim(),
            name: `${(body?.firstName || "").trim()} ${(body?.lastName || "").trim()}`.trim(),
          },
          email_confirm: true, // Auto-confirm for now as per previous manual logic
        });

        if (authError || !authUser.user) {
          throw authError ?? new Error("auth_creation_failed");
        }

        // The SQL trigger on_auth_user_created handles the insertion into public.jobseekers.
        // Record consent metadata on that profile row once it exists. This does not
        // create the row and does not change trigger timing — if the trigger hasn't
        // inserted the row yet, the update below matches zero rows and is treated as
        // a failure (see the explicit check), not a silent success. The auth user
        // created above is intentionally NOT deleted here if this fails — see the
        // known compensation/cleanup limitation noted in the Task 3 report.
        const { error: consentError, data: consentUpdateRows } = await supabaseAdmin
          .from("jobseekers")
          .update({
            consent_given_at: new Date().toISOString(),
            consent_privacy_notice_version: PRIVACY_NOTICE_VERSION,
          })
          .eq("id", authUser.user.id)
          .select("id");

        if (consentError || !consentUpdateRows || consentUpdateRows.length === 0) {
          console.error("[Signup] Consent metadata update failed or affected no profile row", {
            userId: authUser.user.id,
            hadError: Boolean(consentError),
          });
          throw new Error("consent_persistence_failed");
        }

        // We just return the user object to match the expected response
        return {
          id: authUser.user.id,
          email: authUser.user.email,
          first_name: body?.firstName,
          last_name: body?.lastName,
        };
      },
      "jobseekerSignup"
    );

    if (!result.success) {
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