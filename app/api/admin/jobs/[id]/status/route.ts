import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { updateJobStatus } from "@/lib/supabase-admin-data";

const updateJobStatusSchema = z
  .object({
    status: z.enum(["draft", "pending", "active", "closed", "archived"]),
  })
  .strict();

async function isAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = updateJobStatusSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nextStatus = parsed.data.status;
    const updated = await updateJobStatus(id, nextStatus);

    return NextResponse.json({ message: "Job status updated", job: updated });
  } catch (error) {
    console.error("Admin job status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}