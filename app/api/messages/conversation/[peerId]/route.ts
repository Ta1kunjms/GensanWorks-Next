import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id };
}

export async function GET(_req: Request, { params }: { params: Promise<{ peerId: string }> }) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { peerId } = await params;

    const result = await supabaseAdmin
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, read_at, created_at")
      .or(`and(sender_id.eq.${identity.userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${identity.userId})`)
      .order("created_at", { ascending: false });

    return NextResponse.json((result.data ?? []).reverse());
  } catch (error) {
    console.error("Conversation fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ peerId: string }> }) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { peerId } = await params;

    const result = await supabaseAdmin
      .from("messages")
      .delete()
      .or(`and(sender_id.eq.${identity.userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${identity.userId})`)
      .select("id");

    return NextResponse.json({ message: "Conversation deleted", deletedCount: result.data?.length ?? 0 });
  } catch (error) {
    console.error("Conversation delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ peerId: string }> }) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { peerId } = await params;

    const result = await supabaseAdmin
      .from("messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("sender_id", peerId)
      .eq("recipient_id", identity.userId)
      .eq("read", false)
      .select("id");

    return NextResponse.json({ message: "Messages marked as read", updatedCount: result.data?.length ?? 0 });
  } catch (error) {
    console.error("Conversation read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}