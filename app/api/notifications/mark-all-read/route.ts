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

export async function PATCH() {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(notificationsTable)
      .set({
        read: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationsTable.userId, identity.userId),
          eq(notificationsTable.role, identity.role as "admin" | "employer" | "jobseeker"),
          eq(notificationsTable.read, false)
        )
      );

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Notifications mark all read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
