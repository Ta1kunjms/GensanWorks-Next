import { NextResponse } from "next/server";
import { getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { publishRealtimeEvent } from "@/lib/realtime-events";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role as "admin" | "employer" | "jobseeker" };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { id } = await params;

    const result = await supabaseAdmin
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", identity.userId)
      .eq("role", identity.role)
      .select("id, read, read_at")
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Notification not found", requestId }, { status: 404 });
    }

    publishRealtimeEvent({
      type: "notification:update",
      userId: identity.userId,
      payload: {
        notificationId: result.data.id,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ message: "Notification marked as read", notification: result.data, requestId });
  } catch (error) {
    console.error("Notification read update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}