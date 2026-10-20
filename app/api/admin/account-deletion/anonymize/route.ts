export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";
import {
  ANONYMIZED_EMAIL_DOMAIN,
  PROFILE_TABLES,
  anonymizedEmail,
  buildAnonymizedProfileUpdate,
  clearedMetadata,
  decideAnonymization,
  parseRetentionDays,
  retentionCutoff,
  type AnonymizableRole,
} from "@/lib/account-anonymization";

// Stage 2 of account deletion: anonymize direct identifiers of accounts that
// were deactivated (stage 1) longer ago than the retention period.
// - Admin only, recent sign-in required; no scheduled trigger (a human runs it).
// - Dry run unless { "execute": true }.
// - Disabled until ACCOUNT_ANONYMIZATION_RETENTION_DAYS is set by the owner.
// - Step order: auth user -> profile -> request rows. The request rows'
//   anonymized email is the completion marker, so an interrupted run is picked
//   up again next time ("resume").
// - Responses and logs carry counts and request ids only, never personal data.
// Known residuals (not handled here): auth.identities identity_data for OAuth
// users, and uploaded files in Storage.

const bodySchema = z.object({ execute: z.boolean() });
type AnonymizeBody = z.infer<typeof bodySchema>;

const BAN_DURATION = "876000h"; // ~100 years: anonymized auth users cannot sign in

export const POST = createPostHandler<AnonymizeBody>(
  async (ctx: ApiHandlerContext, body?: AnonymizeBody) => {
    const execute = body?.execute === true;
    const retentionDays = parseRetentionDays(process.env.ACCOUNT_ANONYMIZATION_RETENTION_DAYS);
    if (retentionDays === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Anonymization is disabled: ACCOUNT_ANONYMIZATION_RETENTION_DAYS is not configured",
          requestId: ctx.requestId,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const cutoff = retentionCutoff(now, retentionDays);

    // Finished requests carry the anonymized email and are excluded. Newest
    // first, so each user's latest processed request decides (an older request
    // from before a re-activation must not block a newer one), and stale
    // skipped rows sort last instead of crowding out new ones.
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id, role, user_id, processed_at")
      .eq("status", "processed")
      .lte("processed_at", cutoff.toISOString())
      .not("email", "like", `%@${ANONYMIZED_EMAIL_DOMAIN}`)
      .order("processed_at", { ascending: false })
      .limit(200);
    if (requestsError) throw new Error("Failed to load processed deletion requests");

    const summary = { eligible: 0, resumed: 0, anonymized: 0, skippedMissing: 0, skippedActive: 0, skippedChanged: 0, failed: 0 };
    const anonymizedRequestIds: string[] = [];
    const failedRequestIds: string[] = [];
    const handledUsers = new Set<string>();

    for (const request of requests ?? []) {
      const role = request.role as AnonymizableRole;
      const userId = String(request.user_id);
      const table = PROFILE_TABLES[role];
      if (handledUsers.has(userId)) continue; // all of this user's request rows are handled together
      handledUsers.add(userId);
      if (!table) {
        summary.failed++;
        failedRequestIds.push(String(request.id));
        continue;
      }

      const { data: row, error: rowError } = await supabaseAdmin.from(table).select("*").eq("id", userId).maybeSingle();
      if (rowError) {
        summary.failed++;
        failedRequestIds.push(String(request.id));
        continue;
      }

      const decision = decideAnonymization(row as Record<string, unknown> | null, request.processed_at ?? null);
      if (decision === "skip_missing") { summary.skippedMissing++; continue; }
      if (decision === "skip_active") { summary.skippedActive++; continue; }
      if (decision === "skip_changed") { summary.skippedChanged++; continue; }

      summary.eligible++;
      if (decision === "resume") summary.resumed++;
      if (!execute) continue;

      try {
        // 1. Auth user: anonymized email, all user_metadata keys removed, banned.
        const { data: authData, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getError) throw getError;
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: anonymizedEmail(userId),
          email_confirm: true,
          user_metadata: clearedMetadata(authData.user?.user_metadata),
          ban_duration: BAN_DURATION,
        });
        if (authError) throw authError;

        // 2. Profile: direct identifiers overwritten (idempotent on resume).
        const update = buildAnonymizedProfileUpdate(role, userId, row as Record<string, unknown>, now);
        const { error: profileError } = await supabaseAdmin.from(table).update(update).eq("id", userId);
        if (profileError) throw profileError;

        // 3. Every request row of this user (completion marker).
        const { error: requestError } = await supabaseAdmin
          .from("account_deletion_requests")
          .update({ email: anonymizedEmail(userId), reason: null, updated_at: now.toISOString() })
          .eq("user_id", userId);
        if (requestError) throw requestError;

        summary.anonymized++;
        anonymizedRequestIds.push(String(request.id));
      } catch {
        summary.failed++;
        failedRequestIds.push(String(request.id));
      }
    }

    if (execute && ctx.user) {
      await logAuditAction({
        userId: ctx.user.id,
        role: ctx.user.role,
        action: "user_delete",
        resourceType: "system",
        payload: {
          stage: "anonymize",
          retentionDays,
          ...summary,
          anonymizedRequestIds,
          failedRequestIds,
        },
        req: ctx.request,
      });
    }

    return NextResponse.json({
      success: true,
      mode: execute ? "execute" : "dryRun",
      retentionDays,
      cutoff: cutoff.toISOString(),
      ...summary,
      anonymizedRequestIds,
      failedRequestIds,
      requestId: ctx.requestId,
    });
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    requireRecentAuthMinutes: 15,
    bodySchema,
    rateLimitMaxRequests: 5,
  }
);
