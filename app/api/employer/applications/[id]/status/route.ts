import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tryCreateNotification } from "@/lib/notifications";
import { applicationsTable } from "@/db/schema";

const statusSchema = z
  .object({
    status: z.enum([
      "pending",
      "reviewed",
      "shortlisted",
      "interview",
      "hired",
      "rejected",
      "withdrawn",
    ]),
    feedback: z.string().max(5000).optional(),
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
    const parsed = statusSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const [existing] = await db
      .select({
        id: applicationsTable.id,
        applicantId: applicationsTable.applicantId,
      })
      .from(applicationsTable)
      .where(and(eq(applicationsTable.id, id), eq(applicationsTable.employerId, employerId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(applicationsTable)
      .set({
        status: payload.status,
        feedback: payload.feedback?.trim() || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(applicationsTable.id, id), eq(applicationsTable.employerId, employerId)))
      .returning({
        id: applicationsTable.id,
        status: applicationsTable.status,
        applicantId: applicationsTable.applicantId,
        reviewedAt: applicationsTable.reviewedAt,
      });

    if (!updated) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    await tryCreateNotification({
      userId: existing.applicantId,
      role: "jobseeker",
      type: "application",
      title: "Application Status Updated",
      message: `Your application status is now ${updated.status}.`,
      relatedId: updated.id,
      relatedType: "application",
    });

    return NextResponse.json({ message: "Application updated", application: updated });
  } catch (error) {
    console.error("Employer application status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
