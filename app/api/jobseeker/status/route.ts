export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const statusSchema = z.object({
  status: z.enum(["actively_looking", "open", "not_looking"]),
});

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  
  if (!user?.id || user.role !== "jobseeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("jobseekers")
    .select("job_seeking_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Fetch status error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }

  return NextResponse.json({ status: data?.job_seeking_status ?? "not_looking" });
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    
    if (!user?.id || user.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = statusSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status", details: parsed.error.flatten() }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("jobseekers")
      .update({ 
        job_seeking_status: parsed.data.status, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", user.id);

    if (error) {
      console.error("Update status error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: parsed.data.status });
  } catch (err) {
    console.error("Status PATCH exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
