export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || user.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Attempt to delete user via Supabase Admin API
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (error) {
      console.error("Failed to delete user via Supabase Admin:", error);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ message: "Account successfully deleted" }, { status: 200 });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
