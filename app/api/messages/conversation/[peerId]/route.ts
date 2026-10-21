import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/postgrest-safe";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role || !isUuid(user.id)) return null;
  return { userId: user.id };
}

// peerId comes from the URL and is interpolated into a PostgREST `.or()` filter,
// so it must be a strict UUID (prevents filter injection).
function conversationFilter(userId: string, peerId: string) {
  return `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`;
}

const invalidPeer = () => NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

export async function GET(_req: Request, { params }: { params: Promise<{ peerId: string }> }) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { peerId } = await params;
    if (!isUuid(peerId)) return invalidPeer();

    const result = await supabaseAdmin
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, created_at")
      .or(conversationFilter(identity.userId, peerId))
      .order("created_at", { ascending: false });
    if (result.error) throw result.error;

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
    if (!isUuid(peerId)) return invalidPeer();

    const result = await supabaseAdmin
      .from("messages")
      .delete()
      .or(conversationFilter(identity.userId, peerId))
      .select("id");
    if (result.error) throw result.error;

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
    if (!isUuid(peerId)) return invalidPeer();

    const result = await supabaseAdmin
      .from("messages")
      .update({ read: true })
      .eq("sender_id", peerId)
      .eq("recipient_id", identity.userId)
      .eq("read", false)
      .select("id");
    if (result.error) throw result.error;

    return NextResponse.json({ message: "Messages marked as read", updatedCount: result.data?.length ?? 0 });
  } catch (error) {
    console.error("Conversation read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
