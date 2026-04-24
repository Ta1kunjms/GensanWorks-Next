import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

const createNotificationSchema = z
  .object({
    userId: z.string().min(1).max(64).optional(),
    role: z.enum(["admin", "employer", "jobseeker"]).optional(),
    title: z.string().min(1).max(160),
    message: z.string().min(1).max(2000),
    type: z.enum(["system", "job", "application", "message", "referral", "account"]).optional(),
    relatedId: z.string().min(1).max(128).nullable().optional(),
    relatedType: z.enum(["job", "application", "referral", "message"]).nullable().optional(),
  })
  .strict();

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role as "admin" | "employer" | "jobseeker" };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawLimit = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

    const result = await supabaseAdmin
      .from("notifications")
      .select("id, title, message, type, role, related_id, related_type, read, read_at, created_at")
      .eq("user_id", identity.userId)
      .eq("role", identity.role)
      .order("created_at", { ascending: false })
      .limit(limit);

    const notifications = result.data ?? [];
    const unreadCount = notifications.filter((item: Record<string, unknown>) => item.read !== true).length;

    return NextResponse.json({ notifications, unreadCount, requestId });
  } catch (error) {
    console.error("Notifications list error:", error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `notifications:create:${identity.userId}:${clientIp}`,
      maxRequests: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const parsed = createNotificationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const targetUserId = parsed.data.userId ?? identity.userId;
    const targetRole = (parsed.data.role ?? identity.role) as "admin" | "employer" | "jobseeker";
    const isAdmin = identity.role === "admin";

    if (!isAdmin && (targetUserId !== identity.userId || targetRole !== identity.role)) {
      return NextResponse.json(
        { error: "Forbidden to create notifications for other users", requestId },
        { status: 403 }
      );
    }

    const notificationId = await createNotification({
      userId: targetUserId,
      role: targetRole,
      title: parsed.data.title,
      message: parsed.data.message,
      type: parsed.data.type,
      relatedId: parsed.data.relatedId ?? null,
      relatedType: parsed.data.relatedType ?? null,
    });

    return NextResponse.json(
      { message: "Notification created", notificationId, requestId },
      {
        status: 201,
        headers: {
          "x-request-id": requestId,
          "x-ratelimit-remaining": String(rateLimit.remaining),
          "x-ratelimit-reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  } catch (error) {
    console.error("Notification creation error:", error);
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}