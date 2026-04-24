import { NextResponse } from "next/server";
import { z } from "zod";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

const adminRequestSchema = z
  .object({
    name: z.string().min(2).max(255),
    email: z.string().email().max(255),
    phone: z.string().min(7).max(20),
    organization: z.string().min(2).max(255),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const ipRateLimit = enforceRateLimit({
      key: `auth:signup:admin-request:ip:${clientIp}`,
      maxRequests: 6,
      windowMs: 60_000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: ipRateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = adminRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailRateLimit = enforceRateLimit({
      key: `auth:signup:admin-request:email:${email}`,
      maxRequests: 2,
      windowMs: 24 * 60 * 60_000,
    });

    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: emailRateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const existing = await supabaseAdmin
      .from("admin_access_requests")
      .select("id, status")
      .eq("email", email)
      .single();

    if (existing.data?.status === "pending") {
      return NextResponse.json(
        { error: "An admin access request is already pending for this email", requestId },
        { status: 409 }
      );
    }

    if (existing.data?.status === "approved") {
      return NextResponse.json(
        { error: "This email is already approved for admin access", requestId },
        { status: 409 }
      );
    }

    if (existing.data) {
      await supabaseAdmin
        .from("admin_access_requests")
        .update({
          name: parsed.data.name.trim(),
          phone: parsed.data.phone.trim(),
          organization: parsed.data.organization.trim(),
          notes: parsed.data.notes?.trim() || null,
          status: "pending",
          reviewed_at: null,
        })
        .eq("id", existing.data.id);
    } else {
      await supabaseAdmin
        .from("admin_access_requests")
        .insert({
          name: parsed.data.name.trim(),
          email,
          phone: parsed.data.phone.trim(),
          organization: parsed.data.organization.trim(),
          notes: parsed.data.notes?.trim() || null,
          status: "pending",
        });
    }

    return NextResponse.json(
      { message: "Admin access request submitted", requestId },
      { status: 201, headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin request signup error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}