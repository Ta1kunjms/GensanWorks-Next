import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tryCreateNotification } from "@/lib/notifications";
import { employersTable } from "@/db/schema";

const updateEmployerStatusSchema = z
  .object({
    accountStatus: z.enum(["pending", "approved", "rejected", "suspended"]),
  })
  .strict();

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = updateEmployerStatusSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(employersTable)
      .set({
        accountStatus: parsed.data.accountStatus,
        verifiedAt: parsed.data.accountStatus === "approved" ? new Date() : null,
        hasAccount: parsed.data.accountStatus === "approved",
        isActive: parsed.data.accountStatus !== "suspended",
        updatedAt: new Date(),
      })
      .where(eq(employersTable.id, id))
      .returning({
        id: employersTable.id,
        accountStatus: employersTable.accountStatus,
        verifiedAt: employersTable.verifiedAt,
        isActive: employersTable.isActive,
      });

    if (!updated) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    await tryCreateNotification({
      userId: updated.id,
      role: "employer",
      type: "account",
      title: "Employer Account Status Updated",
      message: `Your account status is now ${updated.accountStatus}.`,
      relatedId: updated.id,
      relatedType: null,
    });

    return NextResponse.json({ message: "Employer status updated", employer: updated });
  } catch (error) {
    console.error("Admin employer status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
