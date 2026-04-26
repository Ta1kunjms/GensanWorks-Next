export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

const updateAccessRequestSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
    notes: z.string().max(2000).optional(),
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
  const requestId = getRequestId(req);

  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:access-requests:update:${clientIp}`,
      maxRequests: 40,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const { id } = await params;
    const parsed = updateAccessRequestSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const existing = await supabaseAdmin
      .from("admin_access_requests")
      .select("id, email")
      .eq("id", id)
      .single();

    if (existing.error || !existing.data) {
      return NextResponse.json(
        { error: "Access request not found", requestId },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      status: parsed.data.status,
      notes: parsed.data.notes?.trim() || null,
    };
    if (parsed.data.status !== "pending") {
      updates.reviewed_at = new Date().toISOString();
    }

    const updated = await supabaseAdmin
      .from("admin_access_requests")
      .update(updates)
      .eq("id", id)
      .select("id, status, reviewed_at")
      .single();

    if (updated.error || !updated.data) {
      return NextResponse.json(
        { error: "Access request not found", requestId },
        { status: 404 }
      );
    }

    const matchedUser = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", existing.data.email)
      .single();

    if (matchedUser.data) {
      await tryCreateNotification({
        userId: matchedUser.data.id,
        role: "jobseeker",
        type: "account",
        title: "Access Request Updated",
        message: `Your admin access request status is now ${updated.data.status}.`,
        relatedId: updated.data.id,
        relatedType: null,
      });
    }

    return NextResponse.json(
      { message: "Access request updated", request: updated.data, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin access request update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}