import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobsTable } from "@/db/schema";

const updateStatusSchema = z
  .object({
    status: z.enum(["draft", "pending", "active", "closed", "archived"]),
  })
  .strict();

async function getEmployerId() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (user?.role !== "employer" || !user.id) return null;
  return user.id;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = updateStatusSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nextStatus = parsed.data.status;

    const [updated] = await db
      .update(jobsTable)
      .set({
        status: nextStatus,
        archived: nextStatus === "archived",
        isPublished: nextStatus === "active",
        publishedAt: nextStatus === "active" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobsTable.id, id), eq(jobsTable.employerId, employerId)))
      .returning({ id: jobsTable.id, status: jobsTable.status, isPublished: jobsTable.isPublished });

    if (!updated) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job status updated", job: updated });
  } catch (error) {
    console.error("Employer job status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
