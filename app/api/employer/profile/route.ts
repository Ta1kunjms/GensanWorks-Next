export const dynamic = "force-dynamic";
import { createGetHandler, createPutHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerAccountProfileUpdateSchema } from "@/lib/validation-schemas";
import { getEmployerProfileById } from "@/lib/db-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";
import { z } from "zod";

type EmployerProfileUpdateBody = z.infer<typeof employerAccountProfileUpdateSchema>;

export const GET = createGetHandler(
  async (ctx: ApiHandlerContext) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    const profile = await getEmployerProfileById(ctx.user.id);
    if (!profile) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Profile not found"),
        ctx.requestId
      );
    }

    // Fallback to session image if DB image is missing
    if (!profile.profile_image && ctx.user.image) {
      profile.profile_image = ctx.user.image;
    }

    return successResponse({ profile }, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 40,
  }
);

export const PUT = createPutHandler<EmployerProfileUpdateBody>(
  async (ctx: ApiHandlerContext, body?: EmployerProfileUpdateBody) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    if (!body) {
      return errorResponse(
        createApiError(ErrorCode.BAD_REQUEST, "Body is required"),
        ctx.requestId
      );
    }

    const dbPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        // Special case for BIR 2303 naming mismatch
        if (key === "bir2303File") {
          dbPayload["bir_2303_file"] = value;
          continue;
        }
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dbPayload[snakeKey] = value;
      }
    }

    console.log(`[${ctx.requestId}] Updating profile for ${ctx.user.id}`, dbPayload);

    // Verify existence first
    const { data: existing } = await supabaseAdmin
      .from("employers")
      .select("id")
      .eq("id", ctx.user.id)
      .single();
    
    if (!existing) {
      console.error(`[${ctx.requestId}] Employer record NOT FOUND in table for ID: ${ctx.user.id}`);
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Employer record not found"),
        ctx.requestId
      );
    }

    const { data: updatedProfile, error: dbError } = await supabaseAdmin
      .from("employers")
      .update({ 
        ...dbPayload, 
        account_status: "pending", // Reset to pending whenever profile changes
        updated_at: new Date().toISOString() 
      })
      .eq("id", ctx.user.id)
      .select()
      .single();
    
    if (dbError) {
      console.error(`[${ctx.requestId}] Database update error:`, dbError);
      return errorResponse(
        createApiError(
          ErrorCode.DATABASE_ERROR, 
          `Failed to update profile: ${dbError.message}`,
          "There was a problem saving your changes. Please ensure the database migration has been applied."
        ),
        ctx.requestId
      );
    }
    
    // Sync profile image to auth metadata for sidebar/session use
    if (dbPayload.profile_image) {
      await supabaseAdmin.auth.admin.updateUserById(ctx.user.id, {
        user_metadata: { avatar_url: dbPayload.profile_image }
      });
    }

    if (!updatedProfile) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Profile not found after update"),
        ctx.requestId
      );
    }

    // Notify Admins about the change
    try {
      const { data: admins } = await supabaseAdmin.from("admins").select("id");
      if (admins && admins.length > 0) {
        const employerName = updatedProfile.establishment_name || "An employer";
        await Promise.all(
          admins.map((admin) =>
            tryCreateNotification({
              userId: admin.id,
              role: "admin",
              type: "account",
              title: "Employer Profile Updated",
              message: `${employerName} has updated their profile. It is now pending re-approval.`,
              relatedId: ctx.user!.id,
              relatedType: "employer",
            })
          )
        );
      }
    } catch (notifError) {
      console.warn(`[${ctx.requestId}] Failed to notify admins:`, notifError);
    }

    return successResponse(
      {
        message: "Profile updated and submitted for re-approval",
        profile: updatedProfile,
      },
      ctx.requestId
    );
  },
  {
    bodySchema: employerAccountProfileUpdateSchema,
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 20,
  }
);

