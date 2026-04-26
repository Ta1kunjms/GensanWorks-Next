import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const statusSchema = z.object({
  status: z.enum(["actively_looking", "open", "not_looking"]),
});

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("jobseekers")
    .select("job_seeking_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });

  return NextResponse.json({ status: data?.job_seeking_status ?? "not_looking" });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = statusSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("jobseekers")
    .update({ job_seeking_status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to update status" }, { status: 500 });

  return NextResponse.json({ success: true, status: parsed.data.status });
}
