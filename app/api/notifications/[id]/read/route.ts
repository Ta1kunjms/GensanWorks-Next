import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await supabaseAdmin
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", identity.userId)
      .eq("role", identity.role as "admin" | "employer" | "jobseeker")
      .select("id, read")
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Notification marked as read", notification: result.data });
  } catch (error) {
    console.error("Notification read update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}