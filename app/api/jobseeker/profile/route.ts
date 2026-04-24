import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

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

function computeProfileCompleteness(profile: {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  zipCode?: string | null;
  currentOccupation?: string | null;
  employmentStatus?: string | null;
  educationLevel?: string | null;
  skills?: unknown;
  preferredLocations?: unknown;
  preferredIndustries?: unknown;
  profileImage?: string | null;
}) {
  const checks = [
    Boolean(profile.name?.trim()),
    Boolean(profile.phone?.trim()),
    Boolean(profile.address?.trim()),
    Boolean(profile.city?.trim()),
    Boolean(profile.province?.trim()),
    Boolean(profile.zipCode?.trim()),
    Boolean(profile.currentOccupation?.trim()),
    Boolean(profile.employmentStatus?.trim()),
    Boolean(profile.educationLevel?.trim()),
    Boolean(Array.isArray(profile.skills) && profile.skills.length > 0),
    Boolean(Array.isArray(profile.preferredLocations) && (profile.preferredLocations as unknown[]).length > 0),
    Boolean(Array.isArray(profile.preferredIndustries) && (profile.preferredIndustries as unknown[]).length > 0),
    Boolean(profile.profileImage?.trim()),
  ];

  const filled = checks.filter(Boolean).length;
  const completeness = Math.round((filled / checks.length) * 100);

  return {
    profileComplete: completeness >= 80,
    profileCompleteness: completeness,
  };
}

function normalizeStringArray(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;
}

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

    const result = await supabaseAdmin
      .from("users")
      .select(
        "id, email, name, phone, address, city, province, zip_code, current_occupation, employment_status, education_level, skills, preferred_locations, preferred_industries, profile_image, profile_completeness, profile_complete"
      )
      .eq("id", identity.userId)
      .single();

    if (!result.data) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    const profile = result.data as Record<string, unknown>;
    const derived = computeProfileCompleteness(profile);

    return NextResponse.json(
      {
        profile: {
          ...profile,
          profileComplete: profile.profile_complete ?? derived.profileComplete,
          profileCompleteness: profile.profile_completeness ?? derived.profileCompleteness,
        },
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
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

    const currentResult = await supabaseAdmin
      .from("users")
      .select(
        "name, phone, address, city, province, zip_code, current_occupation, employment_status, education_level, skills, preferred_locations, preferred_industries, profile_image"
      )
      .eq("id", identity.userId)
      .single();

    if (!currentResult.data) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    const currentProfile = currentResult.data as Record<string, unknown>;
    const mergedProfile = { ...currentProfile, ...payload };
    const completeness = computeProfileCompleteness(mergedProfile);

    const updates: Record<string, unknown> = {
      ...payload,
      ...completeness,
      updated_at: new Date().toISOString(),
    };

    const updated = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", identity.userId)
      .select(
        "id, email, name, phone, address, city, province, zip_code, current_occupation, employment_status, education_level, skills, preferred_locations, preferred_industries, profile_image, profile_complete, profile_completeness"
      )
      .single();

    if (updated.error || !updated.data) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Profile updated", profile: updated.data, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Jobseeker profile update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}