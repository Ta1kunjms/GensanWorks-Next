import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id };
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await supabaseAdmin
      .from("messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", identity.userId)
      .select("id, read_at")
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Message marked as read", messageId: result.data.id, readAt: result.data.read_at });
  } catch (error) {
    console.error("Mark message read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}