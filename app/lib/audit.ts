import { supabaseAdmin } from "./supabase";

export type AuditAction = 
  | "profile_update" 
  | "job_application_submit" 
  | "job_save" 
  | "job_unsave"
  | "message_send"
  | "notification_read"
  | "referral_view"
  | "job_approve"
  | "job_reject"
  | "job_archive"
  | "employer_approve"
  | "employer_reject"
  | "user_delete"
  | "user_role_update"
  | "admin_request_approve"
  | "admin_request_reject"
  | "system_setting_update";

export type AuditResourceType = 
  | "jobseeker" 
  | "job" 
  | "application" 
  | "message" 
  | "referral"
  | "employer_profile"
  | "admin_request"
  | "system";

interface AuditLogOptions {
  userId: string;
  role: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  payload?: Record<string, any>;
  req?: Request;
}

/**
 * Logs a sensitive action to the audit_logs table.
 */
export async function logAuditAction({
  userId,
  role,
  action,
  resourceType,
  resourceId,
  payload = {},
  req,
}: AuditLogOptions) {
  try {
    const ipAddress = req?.headers.get("x-forwarded-for") || req?.headers.get("x-real-ip");
    const userAgent = req?.headers.get("user-agent");

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      role,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      payload,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[AuditLog] Failed to insert audit log:", error);
    }
  } catch (err) {
    console.error("[AuditLog] Unexpected error during logging:", err);
  }
}
