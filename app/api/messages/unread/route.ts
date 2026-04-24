import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id };
}

export async function GET() {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", identity.userId)
      .eq("read", false);

    return NextResponse.json({ unreadCount: result.count ?? 0 });
  } catch (error) {
    console.error("Unread messages count error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}