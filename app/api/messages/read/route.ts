import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(200),
});

// Bulk mark-as-read used by app/components/messages-panel.tsx. Only messages
// addressed to the caller are updated (messages has a `read` flag, no timestamp).
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || !user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await supabaseAdmin
      .from("messages")
      .update({ read: true })
      .in("id", parsed.data.messageIds)
      .eq("recipient_id", user.id)
      .select("id");
    if (result.error) throw result.error;

    return NextResponse.json({
      updatedIds: (result.data ?? []).map((row) => row.id),
      readAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Bulk mark messages read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
