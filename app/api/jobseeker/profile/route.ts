export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { jobseekerProfileUpdateSchema } from "@/lib/validation-schemas";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";

function computeProfileCompleteness(profile: Record<string, any>) {
  const checks = [
    Boolean(profile.first_name?.trim()),
    Boolean(profile.last_name?.trim()),
    Boolean(profile.birth_date),
    Boolean(profile.gender?.trim()),
    Boolean(profile.civil_status?.trim()),
    Boolean(profile.phone?.trim()),
    Boolean(profile.barangay?.trim()),
    Boolean(profile.city?.trim()),
    Boolean(profile.province?.trim()),
    Boolean(profile.employment_status?.trim()),
    // Added NSRP specific completeness checks
    Boolean(profile.tin?.trim()),
    Boolean(profile.religion?.trim()),
    Boolean(profile.preferred_occupation_1?.trim()),
    Boolean(profile.preferred_work_location_local_1?.trim()),
  ];

  const filled = checks.filter(Boolean).length;
  const completeness = Math.round((filled / checks.length) * 100);

  return {
    profileComplete: completeness >= 80,
    profileCompleteness: completeness,
  };
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
      .from("jobseekers")
      .select("*")
      .eq("id", identity.userId)
      .single();

    if (!result.data) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    const profile = result.data as Record<string, any>;
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

    const parsed = jobseekerProfileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Convert camelCase to snake_case for Supabase
    const dbPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        // Handle camelCase to snake_case, including numbered suffixes (e.g. location1 -> location_1)
        const snakeKey = key
          .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
          .replace(/([a-z])([0-9])/g, '$1_$2');
        dbPayload[snakeKey] = value;
      }
    }

    const currentResult = await supabaseAdmin
      .from("jobseekers")
      .select("*")
      .eq("id", identity.userId)
      .single();

    if (!currentResult.data) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    const currentProfile = currentResult.data as Record<string, any>;
    const mergedProfile = { ...currentProfile, ...dbPayload };
    const completeness = computeProfileCompleteness(mergedProfile);

    const updates: Record<string, any> = {
      ...dbPayload,
      profile_complete: completeness.profileComplete,
      profile_completeness: completeness.profileCompleteness,
      updated_at: new Date().toISOString(),
    };

    const updated = await supabaseAdmin
      .from("jobseekers")
      .update(updates)
      .eq("id", identity.userId)
      .select("*")
      .single();

    if (updated.error || !updated.data) {
      return NextResponse.json({ error: "Profile not found", requestId }, { status: 404 });
    }

    await logAuditAction({
      userId: identity.userId,
      role: "jobseeker",
      action: "profile_update",
      resourceType: "jobseeker",
      resourceId: identity.userId,
      payload: { updatedFields: Object.keys(updates) },
      req,
    });

    return NextResponse.json(
      { message: "Profile updated", profile: updated.data, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Jobseeker profile update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}