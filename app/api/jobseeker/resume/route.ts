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
      await supabaseAdmin.from("jobseeker_education").delete().eq("jobseeker_id", identity.userId);
      if (payload.education.length > 0) {
        await supabaseAdmin.from("jobseeker_education").insert(
          payload.education.map((e: any) => ({ ...e, jobseeker_id: identity.userId }))
        );
      }
    }

    if (payload.experience) {
      await supabaseAdmin.from("jobseeker_experience").delete().eq("jobseeker_id", identity.userId);
      if (payload.experience.length > 0) {
        await supabaseAdmin.from("jobseeker_experience").insert(
          payload.experience.map((e: any) => ({ ...e, jobseeker_id: identity.userId }))
        );
      }
    }

    if (payload.languages) {
      await supabaseAdmin.from("jobseeker_languages").delete().eq("jobseeker_id", identity.userId);
      if (payload.languages.length > 0) {
        await supabaseAdmin.from("jobseeker_languages").insert(
          payload.languages.map((e: any) => ({ ...e, jobseeker_id: identity.userId }))
        );
      }
    }

    if (payload.trainings) {
      await supabaseAdmin.from("jobseeker_trainings").delete().eq("jobseeker_id", identity.userId);
      if (payload.trainings.length > 0) {
        await supabaseAdmin.from("jobseeker_trainings").insert(
          payload.trainings.map((e: any) => ({ ...e, jobseeker_id: identity.userId }))
        );
      }
    }

    if (payload.licenses) {
      await supabaseAdmin.from("jobseeker_licenses").delete().eq("jobseeker_id", identity.userId);
      if (payload.licenses.length > 0) {
        await supabaseAdmin.from("jobseeker_licenses").insert(
          payload.licenses.map((e: any) => ({ ...e, jobseeker_id: identity.userId }))
        );
      }
    }

    return NextResponse.json({ message: "Resume updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
