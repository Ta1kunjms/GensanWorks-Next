import { supabaseAdmin } from "@/lib/supabase";
import { publishRealtimeEvent } from "@/lib/realtime-events";
import { incrementRealtimeMetric } from "@/lib/realtime-metrics";

export type NotificationRole = "admin" | "employer" | "jobseeker";
export type NotificationType =
  | "system"
  | "job"
  | "application"
  | "message"
  | "referral"
  | "account";
export type RelatedType = "job" | "application" | "referral" | "message";

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
  } catch (error) {
    console.warn("Notification creation skipped:", {
      userId: input.userId,
      role: input.role,
      title: input.title,
      error,
    });
  }
}