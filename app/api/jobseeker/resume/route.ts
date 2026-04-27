export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

async function getIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "jobseeker") return null;
  return { userId: user.id };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getIdentity();
    if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [edu, exp, train, lang, lic] = await Promise.all([
      supabaseAdmin.from("jobseeker_education").select("*").eq("jobseeker_id", identity.userId),
      supabaseAdmin.from("jobseeker_experience").select("*").eq("jobseeker_id", identity.userId),
      supabaseAdmin.from("jobseeker_trainings").select("*").eq("jobseeker_id", identity.userId),
      supabaseAdmin.from("jobseeker_languages").select("*").eq("jobseeker_id", identity.userId),
      supabaseAdmin.from("jobseeker_licenses").select("*").eq("jobseeker_id", identity.userId),
    ]);

    return NextResponse.json({
      education: edu.data || [],
      experience: exp.data || [],
      trainings: train.data || [],
      languages: lang.data || [],
      licenses: lic.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getIdentity();
    if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await req.json();

    // To simplify updates, we delete existing records and insert the new ones
    if (payload.education) {
      const del = await supabaseAdmin.from("jobseeker_education").delete().eq("jobseeker_id", identity.userId);
      if (del.error) throw new Error(`Education delete failed: ${del.error.message}`);
      
      if (payload.education.length > 0) {
        const ins = await supabaseAdmin.from("jobseeker_education").insert(
          payload.education.map((e: any) => {
            const { id, created_at, ...rest } = e; // Strip auto-generated fields if present
            return { ...rest, jobseeker_id: identity.userId };
          })
        );
        if (ins.error) throw new Error(`Education insert failed: ${ins.error.message}`);
      }
    }

    if (payload.experience) {
      const del = await supabaseAdmin.from("jobseeker_experience").delete().eq("jobseeker_id", identity.userId);
      if (del.error) throw new Error(`Experience delete failed: ${del.error.message}`);
      
      if (payload.experience.length > 0) {
        const ins = await supabaseAdmin.from("jobseeker_experience").insert(
          payload.experience.map((e: any) => {
            const { id, created_at, ...rest } = e;
            return { ...rest, jobseeker_id: identity.userId };
          })
        );
        if (ins.error) throw new Error(`Experience insert failed: ${ins.error.message}`);
      }
    }

    if (payload.languages) {
      const del = await supabaseAdmin.from("jobseeker_languages").delete().eq("jobseeker_id", identity.userId);
      if (del.error) throw new Error(`Languages delete failed: ${del.error.message}`);
      
      if (payload.languages.length > 0) {
        const ins = await supabaseAdmin.from("jobseeker_languages").insert(
          payload.languages.map((e: any) => {
            const { id, created_at, ...rest } = e;
            return { ...rest, jobseeker_id: identity.userId };
          })
        );
        if (ins.error) throw new Error(`Languages insert failed: ${ins.error.message}`);
      }
    }

    if (payload.trainings) {
      const del = await supabaseAdmin.from("jobseeker_trainings").delete().eq("jobseeker_id", identity.userId);
      if (del.error) throw new Error(`Trainings delete failed: ${del.error.message}`);
      
      if (payload.trainings.length > 0) {
        const ins = await supabaseAdmin.from("jobseeker_trainings").insert(
          payload.trainings.map((e: any) => {
            const { id, created_at, ...rest } = e;
            return { ...rest, jobseeker_id: identity.userId };
          })
        );
        if (ins.error) throw new Error(`Trainings insert failed: ${ins.error.message}`);
      }
    }

    if (payload.licenses) {
      const del = await supabaseAdmin.from("jobseeker_licenses").delete().eq("jobseeker_id", identity.userId);
      if (del.error) throw new Error(`Licenses delete failed: ${del.error.message}`);
      
      if (payload.licenses.length > 0) {
        const ins = await supabaseAdmin.from("jobseeker_licenses").insert(
          payload.licenses.map((e: any) => {
            const { id, created_at, ...rest } = e;
            return { ...rest, jobseeker_id: identity.userId };
          })
        );
        if (ins.error) throw new Error(`Licenses insert failed: ${ins.error.message}`);
      }
    }

    return NextResponse.json({ message: "Resume updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
