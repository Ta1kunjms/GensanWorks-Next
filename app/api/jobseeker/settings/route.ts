export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getJobseekerId() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "jobseeker") return null;
  return user.id;
}

export async function GET() {
  try {
    const jobseekerId = await getJobseekerId();
    if (!jobseekerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("jobseekers")
      .select("settings")
      .eq("id", jobseekerId)
      .single();

    if (error) throw error;

    return NextResponse.json(data.settings || {});
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const jobseekerId = await getJobseekerId();
    if (!jobseekerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await req.json();

    const { error } = await supabaseAdmin
      .from("jobseekers")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", jobseekerId);

    if (error) throw error;

    return NextResponse.json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
