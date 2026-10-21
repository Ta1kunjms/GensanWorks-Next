export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await supabaseAdmin
      .from("employers")
      // Archiving deactivates the employer (is_active = false); there is no
      // separate archive column. Their jobs are taken offline too.
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("id, is_active")
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const jobs = await supabaseAdmin
      .from("jobs")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("employer_id", id);
    if (jobs.error) throw jobs.error;

    return NextResponse.json({
      message: "Employer archived successfully",
      employer: result.data,
    });
  } catch (error) {
    console.error("Admin employer archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
