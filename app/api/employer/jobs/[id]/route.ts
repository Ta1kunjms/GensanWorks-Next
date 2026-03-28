import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobsTable } from "@/db/schema";

const updateJobSchema = z
  .object({
    positionTitle: z.string().min(2).max(255),
    description: z.string().min(10),
    location: z.string().min(2).max(255),
    employmentType: z.enum([
      "Full-time",
      "Part-time",
      "Contract",
      "Temporary",
      "Freelance",
      "Internship",
    ]),
    salaryMin: z.number().positive().nullable().optional(),
    salaryMax: z.number().positive().nullable().optional(),
    salaryPeriod: z.string().max(50).nullable().optional(),
  })
  .strict();

async function getEmployerId() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (user?.role !== "employer" || !user.id) return null;
  return user.id;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [job] = await db
      .select({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        description: jobsTable.description,
        location: jobsTable.location,
        employmentType: jobsTable.employmentType,
        salaryMin: jobsTable.salaryMin,
        salaryMax: jobsTable.salaryMax,
        salaryPeriod: jobsTable.salaryPeriod,
        status: jobsTable.status,
        isPublished: jobsTable.isPublished,
        archived: jobsTable.archived,
        updatedAt: jobsTable.updatedAt,
      })
      .from(jobsTable)
      .where(and(eq(jobsTable.id, id), eq(jobsTable.employerId, employerId)))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Employer job fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = updateJobSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const [updated] = await db
      .update(jobsTable)
      .set({
        positionTitle: payload.positionTitle.trim(),
        description: payload.description.trim(),
        location: payload.location.trim(),
        employmentType: payload.employmentType,
        salaryMin: typeof payload.salaryMin === "number" ? String(payload.salaryMin) : null,
        salaryMax: typeof payload.salaryMax === "number" ? String(payload.salaryMax) : null,
        salaryPeriod: payload.salaryPeriod?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobsTable.id, id), eq(jobsTable.employerId, employerId)))
      .returning({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        status: jobsTable.status,
        updatedAt: jobsTable.updatedAt,
      });

    if (!updated) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job updated", job: updated });
  } catch (error) {
    console.error("Employer job update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [archived] = await db
      .update(jobsTable)
      .set({
        status: "archived",
        archived: true,
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(and(eq(jobsTable.id, id), eq(jobsTable.employerId, employerId)))
      .returning({ id: jobsTable.id, status: jobsTable.status, archived: jobsTable.archived });

    if (!archived) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job archived", job: archived });
  } catch (error) {
    console.error("Employer job archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
