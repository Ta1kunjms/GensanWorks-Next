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
      updates.is_active = true;
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
      console.error("Employer status update failed:", { id, updates, error: result.error });
      return NextResponse.json({ error: "Employer not found or update failed" }, { status: 404 });
    }

    // Cascade to the employer's jobs (live column: job_status).
    const now = new Date().toISOString();
    if (parsed.data.accountStatus === "suspended") {
      const cascade = await supabaseAdmin
        .from("jobs")
        .update({ job_status: "suspended", is_active: false, updated_at: now })
        .eq("employer_id", id)
        .in("job_status", ["active", "pending", "draft"]);
      if (cascade.error) console.error("Employer suspend: job cascade failed", { code: cascade.error.code });
    } else if (parsed.data.accountStatus === "approved") {
      // Return suspended jobs to draft rather than live: they need re-review.
      const cascade = await supabaseAdmin
        .from("jobs")
        .update({ job_status: "draft", is_active: true, updated_at: now })
        .eq("employer_id", id)
        .eq("job_status", "suspended");
      if (cascade.error) console.error("Employer approve: job cascade failed", { code: cascade.error.code });
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