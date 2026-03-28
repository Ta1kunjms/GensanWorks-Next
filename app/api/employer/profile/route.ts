import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { employersTable } from "@/db/schema";

const companySizeValues = ["Micro", "Small", "Medium", "Large"] as const;

const employerProfileUpdateSchema = z
  .object({
    contactPerson: z.string().min(2).max(255).optional(),
    contactPhone: z.string().min(7).max(20).optional(),
    establishmentName: z.string().min(2).max(255).optional(),
    industry: z.string().max(100).nullable().optional(),
    companyType: z.string().max(100).nullable().optional(),
    companySize: z.enum(companySizeValues).nullable().optional(),
    businessNature: z.string().max(255).nullable().optional(),
    address: z.string().min(5).max(1000).optional(),
    city: z.string().min(2).max(100).optional(),
    province: z.string().min(2).max(100).optional(),
    zipCode: z.string().max(10).nullable().optional(),
    website: z.string().url().max(255).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    yearsInOperation: z.number().int().min(0).max(200).nullable().optional(),
    logoUrl: z.string().url().max(500).nullable().optional(),
    srsFormFile: z.string().url().max(500).nullable().optional(),
    businessPermitFile: z.string().url().max(500).nullable().optional(),
    bir2303File: z.string().url().max(500).nullable().optional(),
    doleCertificationFile: z.string().url().max(500).nullable().optional(),
    companyProfileFile: z.string().url().max(500).nullable().optional(),
  })
  .strict();

async function getIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "employer") {
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
        id: employersTable.id,
        email: employersTable.email,
        contactPerson: employersTable.contactPerson,
        contactPhone: employersTable.contactPhone,
        establishmentName: employersTable.establishmentName,
        industry: employersTable.industry,
        companyType: employersTable.companyType,
        companySize: employersTable.companySize,
        businessNature: employersTable.businessNature,
        address: employersTable.address,
        city: employersTable.city,
        province: employersTable.province,
        zipCode: employersTable.zipCode,
        website: employersTable.website,
        description: employersTable.description,
        yearsInOperation: employersTable.yearsInOperation,
        logoUrl: employersTable.logoUrl,
        srsFormFile: employersTable.srsFormFile,
        businessPermitFile: employersTable.businessPermitFile,
        bir2303File: employersTable.bir2303File,
        doleCertificationFile: employersTable.doleCertificationFile,
        companyProfileFile: employersTable.companyProfileFile,
        accountStatus: employersTable.accountStatus,
      })
      .from(employersTable)
      .where(eq(employersTable.id, identity.userId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    return NextResponse.json({ profile, requestId }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("Employer profile fetch error:", { requestId, error });
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

    const parsed = employerProfileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(employersTable)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(employersTable.id, identity.userId))
      .returning({
        id: employersTable.id,
        email: employersTable.email,
        contactPerson: employersTable.contactPerson,
        contactPhone: employersTable.contactPhone,
        establishmentName: employersTable.establishmentName,
        industry: employersTable.industry,
        companyType: employersTable.companyType,
        companySize: employersTable.companySize,
        businessNature: employersTable.businessNature,
        address: employersTable.address,
        city: employersTable.city,
        province: employersTable.province,
        zipCode: employersTable.zipCode,
        website: employersTable.website,
        description: employersTable.description,
        yearsInOperation: employersTable.yearsInOperation,
        logoUrl: employersTable.logoUrl,
        srsFormFile: employersTable.srsFormFile,
        businessPermitFile: employersTable.businessPermitFile,
        bir2303File: employersTable.bir2303File,
        doleCertificationFile: employersTable.doleCertificationFile,
        companyProfileFile: employersTable.companyProfileFile,
        accountStatus: employersTable.accountStatus,
      });

    if (!updated) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Profile updated", profile: updated, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Employer profile update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
