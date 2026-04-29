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
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("id, is_archived")
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Employer archived successfully",
      employer: result.data,
    });
  } catch (error) {
    console.error("Admin employer archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
