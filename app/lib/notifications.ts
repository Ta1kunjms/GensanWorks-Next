import { db } from "@/lib/db";
import { notificationsTable } from "@/db/schema";

type NotificationRole = "admin" | "employer" | "jobseeker";
type NotificationType = "system" | "job" | "application" | "message" | "referral" | "account";
type RelatedType = "job" | "application" | "referral" | "message";

type CreateNotificationInput = {
  userId: string;
  role: NotificationRole;
  type?: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: RelatedType | null;
};

export async function createNotification(input: CreateNotificationInput) {
  await db.insert(notificationsTable).values({
    userId: input.userId,
    role: input.role,
    type: input.type ?? "system",
    title: input.title,
    message: input.message,
    relatedId: input.relatedId ?? null,
    relatedType: input.relatedType ?? null,
    read: false,
  });
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
