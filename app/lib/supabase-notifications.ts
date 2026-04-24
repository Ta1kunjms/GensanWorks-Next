import { supabaseAdmin } from "./supabase";

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: string;
}) {
  const { data: result, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "info",
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getNotifications(userId: string, limit = 20) {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return { success: true };
}

export async function deleteNotification(notificationId: string) {
  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
  return { success: true };
}

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}