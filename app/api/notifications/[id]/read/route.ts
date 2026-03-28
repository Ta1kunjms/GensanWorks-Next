import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationsTable } from "@/db/schema";

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

    const [updated] = await db
      .update(notificationsTable)
      .set({ read: true, readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, identity.userId),
          eq(notificationsTable.role, identity.role as "admin" | "employer" | "jobseeker")
        )
      )
      .returning({ id: notificationsTable.id, read: notificationsTable.read });

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Notification marked as read", notification: updated });
  } catch (error) {
    console.error("Notification read update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
