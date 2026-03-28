import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messagesTable } from "@/db/schema";

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

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(and(eq(messagesTable.recipientId, identity.userId), eq(messagesTable.read, false)));

    return NextResponse.json({ unreadCount: Number(row?.count ?? 0) });
  } catch (error) {
    console.error("Unread messages count error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
