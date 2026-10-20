import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostHandler, ApiHandlerContext } from "@/lib/api-handler";
import { oauthConsentRequestSchema } from "@/lib/validation-schemas";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { applyConsentAction, type ConsentStore } from "@/lib/google-consent";

type OAuthConsentBody = z.infer<typeof oauthConsentRequestSchema>;

// Service-role writes are scoped to the session user's own id, which comes
// from supabase.auth.getUser() — never from the request body.
const store: ConsentStore = {
  async updateJobseeker(id, values) {
    const { data, error } = await supabaseAdmin
      .from("jobseekers")
      .update(values)
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },
  async deactivateActiveJobseeker(id, updatedAt) {
    const { data, error } = await supabaseAdmin
      .from("jobseekers")
      .update({ is_active: false, updated_at: updatedAt })
      .eq("id", id)
      .eq("is_active", true)
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },
  async insertJobseeker(values) {
    const { error } = await supabaseAdmin.from("jobseekers").insert(values);
    if (error) throw error;
  },
  async setAppMetadata(id, appMetadata) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: appMetadata,
    });
    if (error) throw error;
  },
};

export const POST = createPostHandler<OAuthConsentBody>(
  async (ctx: ApiHandlerContext, body?: OAuthConsentBody) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      const result = await applyConsentAction(user, body!.action, store);

      if ("error" in result) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status });
      }

      if (result.signOut) {
        await supabase.auth.signOut();
      }

      const response = NextResponse.json({
        success: true,
        data: { redirectTo: result.redirectTo },
        requestId: ctx.requestId,
      });
      response.headers.set("X-Request-ID", ctx.requestId);
      return response;
    } catch (error) {
      // 23505 = unique violation: another profile already uses this email (for
      // example an earlier account that was removed from Auth). Never link to it
      // automatically; tell the user how to proceed.
      if ((error as { code?: string } | null)?.code === "23505") {
        console.warn("[Consent] Email already belongs to another profile", { requestId: ctx.requestId });
        return NextResponse.json(
          {
            success: false,
            error:
              "This Google email is already linked to another GensanWorks profile. Sign in with that account's email and password, or contact PESO General Santos to have the accounts merged.",
          },
          { status: 409 }
        );
      }
      console.error("[Consent] Failed to apply consent action", {
        requestId: ctx.requestId,
        action: body?.action,
        hadError: Boolean(error),
      });
      return NextResponse.json(
        { success: false, error: "Unable to save your choice. Please try again." },
        { status: 500 }
      );
    }
  },
  {
    bodySchema: oauthConsentRequestSchema,
    rateLimitMaxRequests: 10,
  }
);
