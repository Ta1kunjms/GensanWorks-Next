export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";
import { logAuditAction } from "@/lib/audit";
import { resetJobseekerPassword } from "@/lib/admin-jobseeker-password-reset";
import { supabaseAdmin } from "@/lib/supabase";

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (role !== "admin" || !userId) {
    return null;
  }

  return { userId };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);

  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { id } = await params;
    const parsed = resetPasswordSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const result = await resetJobseekerPassword({
      jobseekerId: id,
      newPassword: parsed.data.newPassword,
    }, {
      getJobseekerById: async (jobseekerId) => {
        const { data, error } = await supabaseAdmin
          .from("jobseekers")
          .select("id, email, first_name, last_name")
          .eq("id", jobseekerId)
          .single();

        return {
          data: data
            ? {
                id: data.id,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
              }
            : null,
          error: error ? { message: error.message } : null,
        };
      },
      updateUserPassword: async (userId, password) => {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });

        return {
          data: data
            ? {
                user: data.user ? { id: data.user.id } : undefined,
              }
            : null,
          error: error ? { message: error.message } : null,
        };
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, requestId }, { status: result.status });
    }

    await logAuditAction({
      userId: admin.userId,
      role: "admin",
      action: "user_password_reset",
      resourceType: "jobseeker",
      resourceId: id,
      payload: {
        targetEmail: result.jobseeker.email,
        targetName: [result.jobseeker.first_name, result.jobseeker.last_name].filter(Boolean).join(" "),
      },
      req,
    });

    return NextResponse.json(
      { message: "Password updated", requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin jobseeker password reset error:", error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
