import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobsTable } from "@/db/schema";

const createJobSchema = z
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
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    salaryPeriod: z.string().max(50).optional(),
  })
  .strict();

async function getEmployerId() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (user?.role !== "employer" || !user.id) return null;
  return user.id;
}

export async function GET() {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await db
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
        createdAt: jobsTable.createdAt,
      })
      .from(jobsTable)
      .where(eq(jobsTable.employerId, employerId))
      .orderBy(desc(jobsTable.createdAt));

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Employer jobs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = createJobSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const [created] = await db
      .insert(jobsTable)
      .values({
        employerId,
        positionTitle: payload.positionTitle.trim(),
        description: payload.description.trim(),
        location: payload.location.trim(),
        employmentType: payload.employmentType,
        salaryMin:
          typeof payload.salaryMin === "number" ? String(payload.salaryMin) : null,
        salaryMax:
          typeof payload.salaryMax === "number" ? String(payload.salaryMax) : null,
        salaryPeriod: payload.salaryPeriod?.trim() || null,
        status: "pending",
        isPublished: false,
        archived: false,
      })
      .returning({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        status: jobsTable.status,
      });

    return NextResponse.json(
      { message: "Job created and submitted for review", job: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("Employer job create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
