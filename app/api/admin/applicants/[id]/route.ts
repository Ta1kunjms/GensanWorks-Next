import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
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
    const result = await supabaseAdmin.from("users").delete().eq("id", id).select("id").single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Applicant deleted", id });
  } catch (error) {
    console.error("Admin applicant delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}