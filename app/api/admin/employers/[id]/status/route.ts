export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

const updateEmployerStatusSchema = z
  .object({
    accountStatus: z.enum(["pending", "approved", "rejected", "suspended"]),
  })
  .strict();

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = updateEmployerStatusSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      account_status: parsed.data.accountStatus,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.accountStatus === "approved") {
      updates.verified_at = new Date().toISOString();
      updates.has_account = true;
    }
    if (parsed.data.accountStatus === "suspended") {
      updates.is_active = false;
    }

    const result = await supabaseAdmin
      .from("employers")
      .update(updates)
      .eq("id", id)
      .select("id, account_status, verified_at, is_active")
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    await tryCreateNotification({
      userId: id,
      role: "employer",
      type: "account",
      title: "Employer Account Status Updated",
      message: `Your account status is now ${result.data.account_status}.`,
      relatedId: id,
      relatedType: null,
    });

    return NextResponse.json({
      message: "Employer status updated",
      employer: {
        id: result.data.id,
        accountStatus: result.data.account_status,
        verifiedAt: result.data.verified_at,
        isActive: result.data.is_active,
      },
    });
  } catch (error) {
    console.error("Admin employer status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}