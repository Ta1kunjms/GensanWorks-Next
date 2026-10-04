import { supabaseAdmin } from "@/lib/supabase";
import { publishRealtimeEvent } from "@/lib/realtime-events";
import { incrementRealtimeMetric } from "@/lib/realtime-metrics";
import { sendNotificationEmail } from "@/lib/auth-email";

export type NotificationRole = "admin" | "employer" | "jobseeker";
export type NotificationType =
  | "system"
  | "job"
  | "application"
  | "message"
  | "referral"
  | "account"
  | "srs_review"
  | "matching_report"
  | "referral_slip"
  | "application_status";
export type RelatedType = "job" | "application" | "referral" | "message" | "employer" | "referral_slip";

export type CreateNotificationInput = {
  userId: string;
  role: NotificationRole;
  type?: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: RelatedType | null;
};

type RecipientContact = {
  name: string;
  email: string | null;
  phone: string | null;
};

// Helper function to build notification action URLs for deep-linking
export function getNotificationActionUrl(role: NotificationRole, type?: NotificationType): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://gensanworks.com";
  if (role === "jobseeker" && (type === "referral_slip" || type === "referral")) {
    return `${base}/jobseeker/referrals`;
  }
  if (role === "employer" && (type === "referral_slip" || type === "referral")) {
    return `${base}/employer/applications?tab=referrals`;
  }
  return base;
}

async function getRecipientContact(userId: string, role: NotificationRole): Promise<RecipientContact | null> {
  if (role === "jobseeker") {
    const result = await supabaseAdmin
      .from("jobseekers")
      .select("first_name, middle_name, last_name, suffix, email, phone")
      .eq("id", userId)
      .single();
    if (!result.data) return null;
    const composedName = [result.data.first_name, result.data.middle_name, result.data.last_name, result.data.suffix]
      .filter((part): part is string => Boolean(part && String(part).trim()))
      .map((part) => String(part).trim())
      .join(" ");
    return {
      name: composedName,
      email: result.data.email ? String(result.data.email) : null,
      phone: result.data.phone ? String(result.data.phone) : null,
    };
  }

  if (role === "employer") {
    const result = await supabaseAdmin
      .from("employers")
      .select("establishment_name, email, contact_phone")
      .eq("id", userId)
      .single();
    if (!result.data) return null;
    return {
      name: String(result.data.establishment_name ?? ""),
      email: result.data.email ? String(result.data.email) : null,
      phone: result.data.contact_phone ? String(result.data.contact_phone) : null,
    };
  }

  const result = await supabaseAdmin
    .from("admins")
    .select("name, email")
    .eq("id", userId)
    .single();

  if (!result.data) return null;
  return {
    name: String(result.data.name ?? ""),
    email: result.data.email ? String(result.data.email) : null,
    phone: null,
  };
}

export async function createNotification(input: CreateNotificationInput) {
  const inserted = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: input.userId,
      role: input.role,
      type: input.type ?? "system",
      title: input.title,
      message: input.message,
      related_id: input.relatedId ?? null,
      related_type: input.relatedType ?? null,
      read: false,
    })
    .select("id")
    .single();

  if (inserted.data) {
    publishRealtimeEvent({
      type: "notification:update",
      userId: input.userId,
      payload: {
        notificationId: inserted.data.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return inserted.data?.id ?? null;
}

export async function tryCreateNotification(input: CreateNotificationInput) {
  try {
    await createNotification(input);

    // Email fallback for important notifications (like messages and application updates)
    // Email fallback for important notifications (like messages and application updates)
    if (["message", "application", "referral", "srs_review", "matching_report", "referral_slip", "application_status"].includes(input.type ?? "")) {
      const contact = await getRecipientContact(input.userId, input.role);
      
      if (contact && contact.email) {
        // Construct the target URL for notification deep-linking
        const targetUrl = getNotificationActionUrl(input.role, input.type);

        await sendNotificationEmail({
          to: contact.email,
          subject: `GensanWorks: ${input.title}`,
          text: `Hi ${contact.name},\n\n${input.message}\n\n${targetUrl}\n\nThank you,\nGensanWorks Team`,
          html: `<p>Hi ${contact.name},</p><p>${input.message}</p><p>Please <a href="${targetUrl}">click here to view the details on GensanWorks</a>.</p><br/><p>Thank you,<br/>GensanWorks Team</p>`,
        });
      }
    }
  } catch (error) {
    console.warn("Notification creation skipped:", {
      userId: input.userId,
      role: input.role,
      title: input.title,
      error,
    });
  }
}