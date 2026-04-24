import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { publishRealtimeEvent } from "@/lib/realtime-events";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

export async function PATCH() {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabaseAdmin
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", identity.userId)
      .eq("role", identity.role as "admin" | "employer" | "jobseeker")
      .eq("read", false);

    publishRealtimeEvent({
      type: "notification:update",
      userId: identity.userId,
      payload: {
        notificationId: null,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Notifications mark all read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}