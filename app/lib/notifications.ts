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

async function getRecipientContact(userId: string, role: NotificationRole): Promise<RecipientContact | null> {
  if (role === "jobseeker") {
    const result = await supabaseAdmin
      .from("users")
      .select("name, email, phone")
      .eq("id", userId)
      .single();
    if (!result.data) return null;
    return {
      name: String(result.data.name ?? ""),
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
        await sendNotificationEmail({
          to: contact.email,
          subject: `GensanWorks: ${input.title}`,
          text: `Hi ${contact.name},\n\n${input.message}\n\nPlease log in to your GensanWorks account to view the details.\n\nThank you,\nGensanWorks Team`,
          html: `<p>Hi ${contact.name},</p><p>${input.message}</p><p>Please <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gensanworks.com'}">log in to your GensanWorks account</a> to view the details.</p><br/><p>Thank you,<br/>GensanWorks Team</p>`,
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