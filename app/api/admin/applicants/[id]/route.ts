export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

    // Auto-generate NSRP ID if missing
    if (!profile.nsrp_id) {
      const generatedId = `NSRP-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("jobseekers")
        .update({ nsrp_id: generatedId })
        .eq("id", id)
        .select("*")
        .single();
      
      if (!updateError && updatedProfile) {
        profile.nsrp_id = updatedProfile.nsrp_id;
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
      profile,
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // We should delete from jobseekers table
    const result = await supabaseAdmin.from("jobseekers").delete().eq("id", id).select("id").single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job seeker deleted", id });
  } catch (error) {
    console.error("Admin applicant delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}