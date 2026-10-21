export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { omitSecrets } from "@/lib/profile-secrets";
import { isUuid } from "@/lib/postgrest-safe";
import { logAuditAction } from "@/lib/audit";
import { randomInt } from "node:crypto";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch full jobseeker profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("jobseekers")
      .select("*")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    // Auto-generate an NSRP ID if missing: cryptographically random, retried on collision.
    if (!profile.nsrp_id) {
      for (let attempt = 0; attempt < 3 && !profile.nsrp_id; attempt++) {
        const generatedId = `NSRP-${randomInt(10_000_000, 100_000_000)}`;
        const { count } = await supabaseAdmin
          .from("jobseekers")
          .select("id", { count: "exact", head: true })
          .eq("nsrp_id", generatedId);
        if ((count ?? 0) > 0) continue;
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from("jobseekers")
          .update({ nsrp_id: generatedId })
          .eq("id", id)
          .is("nsrp_id", null)
          .select("nsrp_id")
          .maybeSingle();
        if (!updateError && updatedProfile) profile.nsrp_id = updatedProfile.nsrp_id;
      }
    }

    // Fetch related resume data
    const [edu, exp, trn, lng, lic] = await Promise.all([
      supabaseAdmin.from("jobseeker_education").select("*").eq("jobseeker_id", id).order("year_graduated", { ascending: false }),
      supabaseAdmin.from("jobseeker_experience").select("*").eq("jobseeker_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("jobseeker_trainings").select("*").eq("jobseeker_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("jobseeker_languages").select("*").eq("jobseeker_id", id),
      supabaseAdmin.from("jobseeker_licenses").select("*").eq("jobseeker_id", id),
    ]);

    return NextResponse.json({
      profile: omitSecrets(profile),
      resume: {
        education: edu.data || [],
        experience: exp.data || [],
        trainings: trn.data || [],
        languages: lng.data || [],
        licenses: lic.data || [],
      }
    });
  } catch (error) {
    console.error("Admin jobseeker fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE follows the two-stage account deletion policy instead of a hard
// delete: stage 1 deactivates the profile now and records a processed deletion
// request; stage 2 (POST /api/admin/account-deletion/anonymize) anonymizes it
// after the retention period. Related applications and referrals stay intact.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const admin = session?.user as { id?: string; role?: string } | undefined;
    if (!admin?.id || admin.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    const { data: profile, error: lookupError } = await supabaseAdmin
      .from("jobseekers")
      .select("id, email, is_active")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!profile) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    const { error: deactivateError } = await supabaseAdmin
      .from("jobseekers")
      .update({ is_active: false, updated_at: nowIso })
      .eq("id", id);
    if (deactivateError) throw deactivateError;

    // Reuse an open request if the jobseeker already asked for deletion.
    const { data: openRequest, error: openError } = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id")
      .eq("role", "jobseeker")
      .eq("user_id", id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (openError) throw openError;

    const requestFields = {
      status: "processed",
      processed_at: nowIso,
      delete_after: nowIso,
      updated_at: nowIso,
    };
    const { error: requestError } = openRequest
      ? await supabaseAdmin.from("account_deletion_requests").update(requestFields).eq("id", openRequest.id)
      : await supabaseAdmin.from("account_deletion_requests").insert({
          ...requestFields,
          user_id: id,
          role: "jobseeker",
          email: profile.email,
          reason: "Removed by PESO administrator",
          requested_at: nowIso,
        });
    if (requestError) throw requestError;

    await logAuditAction({
      userId: admin.id,
      role: "admin",
      action: "user_delete",
      resourceType: "jobseeker",
      resourceId: id,
      payload: { stage: "deactivated", wasActive: profile.is_active, reusedRequest: Boolean(openRequest) },
      req,
    });

    return NextResponse.json({
      message: "Job seeker deactivated; the profile will be anonymized after the retention period",
      id,
    });
  } catch (error) {
    console.error("Admin applicant delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
