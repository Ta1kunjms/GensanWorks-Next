import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationsTable } from "@/db/schema";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

export async function GET(req: Request) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const notifications = await db
      .select({
        id: notificationsTable.id,
        title: notificationsTable.title,
        message: notificationsTable.message,
        type: notificationsTable.type,
        role: notificationsTable.role,
        relatedId: notificationsTable.relatedId,
        relatedType: notificationsTable.relatedType,
        read: notificationsTable.read,
        readAt: notificationsTable.readAt,
        createdAt: notificationsTable.createdAt,
      })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, identity.userId),
          eq(notificationsTable.role, identity.role as "admin" | "employer" | "jobseeker")
        )
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);

    const unreadCount = notifications.filter((item) => item.read !== true).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
