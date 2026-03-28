import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { usersTable } from "@/db/schema";

const employmentStatusValues = [
  "Unemployed",
  "Employed",
  "Self-employed",
  "Student",
  "Retired",
  "OFW",
  "Freelancer",
  "4PS",
  "PWD",
] as const;

const educationLevelValues = [
  "Elementary",
  "High School",
  "Vocational",
  "Associate",
  "Bachelor",
  "Master",
  "Doctorate",
] as const;

const profileUpdateSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    phone: z.string().max(20).nullable().optional(),
    address: z.string().max(1000).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    province: z.string().max(100).nullable().optional(),
    zipCode: z.string().max(10).nullable().optional(),
    currentOccupation: z.string().max(255).nullable().optional(),
    employmentStatus: z.enum(employmentStatusValues).nullable().optional(),
    educationLevel: z.enum(educationLevelValues).nullable().optional(),
    skills: z.array(z.string().min(1).max(100)).max(100).nullable().optional(),
    preferredLocations: z.array(z.string().min(1).max(100)).max(100).nullable().optional(),
    preferredIndustries: z.array(z.string().min(1).max(100)).max(100).nullable().optional(),
    profileImage: z.string().url().max(500).nullable().optional(),
  })
  .strict();

async function getIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "jobseeker") {
    return null;
  }
  return { userId: user.id };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const [profile] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        phone: usersTable.phone,
        address: usersTable.address,
        city: usersTable.city,
        province: usersTable.province,
        zipCode: usersTable.zipCode,
        currentOccupation: usersTable.currentOccupation,
        employmentStatus: usersTable.employmentStatus,
        educationLevel: usersTable.educationLevel,
        skills: usersTable.skills,
        preferredLocations: usersTable.preferredLocations,
        preferredIndustries: usersTable.preferredIndustries,
        profileImage: usersTable.profileImage,
        profileCompleteness: usersTable.profileCompleteness,
      })
      .from(usersTable)
      .where(eq(usersTable.id, identity.userId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    return NextResponse.json({ profile, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("Jobseeker profile fetch error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const parsed = profileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const [updated] = await db
      .update(usersTable)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, identity.userId))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        phone: usersTable.phone,
        address: usersTable.address,
        city: usersTable.city,
        province: usersTable.province,
        zipCode: usersTable.zipCode,
        currentOccupation: usersTable.currentOccupation,
        employmentStatus: usersTable.employmentStatus,
        educationLevel: usersTable.educationLevel,
        skills: usersTable.skills,
        preferredLocations: usersTable.preferredLocations,
        preferredIndustries: usersTable.preferredIndustries,
        profileImage: usersTable.profileImage,
      });

    if (!updated) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Profile updated", profile: updated, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Jobseeker profile update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
