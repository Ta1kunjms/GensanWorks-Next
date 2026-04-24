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
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") ?? "jobseeker";

    if (role === "admin") {
      const result = await supabaseAdmin.from("admins").delete().eq("id", id).select("id").single();
      if (result.error || !result.data) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Admin deleted", id });
    }

    const result = await supabaseAdmin.from("users").delete().eq("id", id).select("id").single();
    if (result.error || !result.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted", id });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}