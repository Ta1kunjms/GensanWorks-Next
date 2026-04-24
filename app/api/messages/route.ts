import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
  parseBoundedInt,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";
import { publishRealtimeEvent } from "@/lib/realtime-events";
import { incrementRealtimeMetric } from "@/lib/realtime-metrics";

const sendMessageSchema = z
  .object({
    recipientId: z.string().min(1).max(64).optional(),
    receiverId: z.string().min(1).max(64).optional(),
    recipientRole: z.enum(["admin", "employer", "jobseeker"]).optional(),
    receiverRole: z.enum(["admin", "employer", "jobseeker"]).optional(),
    content: z.string().min(1).max(5000),
  })
  .strict();

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role, name: user.name ?? null };
}

async function resolveActorMeta(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const meta = new Map<string, { name: string; role: "admin" | "employer" | "jobseeker" }>();

  if (uniqueIds.length === 0) return meta;

  const [usersResult, employersResult, adminsResult] = await Promise.all([
    supabaseAdmin.from("users").select("id, name").in("id", uniqueIds),
    supabaseAdmin.from("employers").select("id, establishment_name").in("id", uniqueIds),
    supabaseAdmin.from("admins").select("id, name").in("id", uniqueIds),
  ]);

  (usersResult.data ?? []).forEach((item: Record<string, unknown>) => {
    meta.set(String(item.id), { name: String(item.name), role: "jobseeker" });
  });
  (employersResult.data ?? []).forEach((item: Record<string, unknown>) => {
    meta.set(String(item.id), { name: String(item.establishment_name), role: "employer" });
  });
  (adminsResult.data ?? []).forEach((item: Record<string, unknown>) => {
    meta.set(String(item.id), { name: String(item.name), role: "admin" });
  });

  return meta;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type")?.toLowerCase() ?? "";
    const peerId = searchParams.get("peerId") ?? searchParams.get("user_id");
    const before = searchParams.get("before");
    const limit = parseBoundedInt(searchParams.get("limit"), { fallback: 100, min: 1, max: 100 });
    const q = searchParams.get("q")?.trim().slice(0, 100) ?? "";

    if (type === "all") {
      let query = supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, content, read, created_at")
        .or(`sender_id.eq.${identity.userId},recipient_id.eq.${identity.userId}`)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 200));

      if (q) {
        query = query.ilike("content", `%${q}%`);
      }

      const result = await query;
      const rows = result.data ?? [];

      const actorMeta = await resolveActorMeta(
        rows.flatMap((row: Record<string, unknown>) => [String(row.sender_id), String(row.recipient_id)])
      );

      const messages = rows.map((row: Record<string, unknown>) => {
        const senderMeta = actorMeta.get(String(row.sender_id));
        const recipientMeta = actorMeta.get(String(row.recipient_id));
        const peerId2 = row.sender_id === identity.userId ? row.recipient_id : row.sender_id;
        const peerMeta = actorMeta.get(String(peerId2));

        return {
          id: row.id,
          senderId: row.sender_id,
          senderRole: senderMeta?.role ?? null,
          senderName: senderMeta?.name ?? null,
          receiverId: row.recipient_id,
          receiverRole: recipientMeta?.role ?? null,
          receiverName: recipientMeta?.name ?? null,
          peerId: peerId2,
          peerName: peerMeta?.name ?? peerId2,
          subject: null,
          content: row.content,
          createdAt: row.created_at,
          isRead: row.read === true,
        };
      });

      return NextResponse.json(messages);
    }

    if (!peerId) {
      const beforeDate = before ? new Date(before) : null;
      const isValidBefore = Boolean(beforeDate && !Number.isNaN(beforeDate.getTime()));

      let query = supabaseAdmin
        .from("messages")
        .select("id, sender_id, recipient_id, content, read, created_at")
        .or(`sender_id.eq.${identity.userId},recipient_id.eq.${identity.userId}`)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 100) * 2);

      if (q) {
        query = query.ilike("content", `%${q}%`);
      }
      if (isValidBefore) {
        query = query.lt("created_at", beforeDate!.toISOString());
      }

      const result = await query;
      const rows = result.data ?? [];

      const unreadCounts = new Map<string, number>();
      rows.forEach((item: Record<string, unknown>) => {
        const otherUserId = item.sender_id === identity.userId ? item.recipient_id : item.sender_id;
        const isUnread = item.read !== true && item.recipient_id === identity.userId;
        if (isUnread) {
          unreadCounts.set(String(otherUserId), (unreadCounts.get(String(otherUserId)) ?? 0) + 1);
        }
      });

      const seen = new Set<string>();
      const orderedConversations = rows
        .map((item: Record<string, unknown>) => {
          const otherUserId = item.sender_id === identity.userId ? item.recipient_id : item.sender_id;
          return { otherUserId: String(otherUserId), lastMessage: item.content, lastMessageAt: item.created_at };
        })
        .filter((item) => {
          if (seen.has(item.otherUserId)) return false;
          seen.add(item.otherUserId);
          return true;
        })
        .slice(0, limit);

      const actorMeta = await resolveActorMeta(orderedConversations.map((item) => item.otherUserId));

      const conversations = orderedConversations.map((item) => {
        const meta = actorMeta.get(item.otherUserId);
        return {
          otherUserId: item.otherUserId,
          otherUserName: meta?.name ?? item.otherUserId,
          otherUserRole: meta?.role ?? "jobseeker",
          lastMessage: item.lastMessage,
          lastMessageAt: item.lastMessageAt,
          unreadCount: unreadCounts.get(item.otherUserId) ?? 0,
        };
      });

      const nextBefore = conversations.at(-1)?.lastMessageAt
        ? new Date(String(conversations.at(-1)!.lastMessageAt)).toISOString()
        : null;

      return NextResponse.json({
        conversations,
        page: { hasMore: rows.length >= limit, nextBefore },
        requestId,
      });
    }

    let query = supabaseAdmin
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, read_at, created_at")
      .or(`and(sender_id.eq.${identity.userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${identity.userId})`)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (q) {
      query = query.ilike("content", `%${q}%`);
    }
    if (before) {
      query = query.lt("created_at", before);
    }

    const result = await query;
    const rows = result.data ?? [];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const messages = [...pageRows].reverse();
    const nextBefore = messages[0]?.created_at ? new Date(String(messages[0].created_at)).toISOString() : null;

    return NextResponse.json({
      messages,
      page: { hasMore, nextBefore },
      currentUserId: identity.userId,
      requestId,
    });
  } catch (error) {
    console.error("Messages fetch error:", { requestId, error });
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
      key: `messages:send:${identity.userId}:${clientIp}`,
      maxRequests: 25,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const parsed = sendMessageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const targetRecipientId = payload.recipientId ?? payload.receiverId;
    const targetRecipientRole = payload.recipientRole ?? payload.receiverRole;

    if (!targetRecipientId || !targetRecipientRole) {
      return NextResponse.json({ error: "Invalid payload", requestId }, { status: 400 });
    }

    if (targetRecipientId === identity.userId) {
      return NextResponse.json({ error: "Cannot message yourself", requestId }, { status: 400 });
    }

    const inserted = await supabaseAdmin
      .from("messages")
      .insert({
        sender_id: identity.userId,
        recipient_id: targetRecipientId,
        content: payload.content.trim(),
        read: false,
      })
      .select("id, sender_id, recipient_id, content, created_at")
      .single();

    if (inserted.error || !inserted.data) {
      incrementRealtimeMetric("messages_send_failure");
      return NextResponse.json({ error: "Failed to send message", requestId }, { status: 500 });
    }

    incrementRealtimeMetric("messages_send_success");

    const createdAtIso = new Date(String(inserted.data.created_at)).toISOString();
    publishRealtimeEvent({
      type: "message:new",
      userId: targetRecipientId,
      payload: {
        messageId: inserted.data.id,
        senderId: inserted.data.sender_id,
        recipientId: inserted.data.recipient_id,
        createdAt: createdAtIso,
      },
    });
    publishRealtimeEvent({
      type: "message:new",
      userId: identity.userId,
      payload: {
        messageId: inserted.data.id,
        senderId: inserted.data.sender_id,
        recipientId: inserted.data.recipient_id,
        createdAt: createdAtIso,
      },
    });

    await tryCreateNotification({
      userId: targetRecipientId,
      role: targetRecipientRole,
      type: "message",
      title: "New Message",
      message: `${identity.name ?? "Someone"} sent you a message.`,
      relatedId: inserted.data.id,
      relatedType: "message",
    });

    return NextResponse.json(
      { message: "Message sent", data: inserted.data, requestId },
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
    incrementRealtimeMetric("messages_send_failure");
    console.error("Message send error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}