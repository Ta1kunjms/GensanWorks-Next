import { NextResponse } from "next/server";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
  parseBoundedInt,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { tryCreateNotification } from "@/lib/notifications";
import { incrementRealtimeMetric } from "@/lib/realtime-metrics";
import { adminsTable, employersTable, messagesTable, usersTable } from "@/db/schema";

const sendMessageSchema = z
  .object({
    recipientId: z.string().min(1).max(64),
    recipientRole: z.enum(["admin", "employer", "jobseeker"]),
    content: z.string().min(1).max(5000),
  })
  .strict();

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role, name: user.name ?? null };
}

type ActorMeta = {
  name: string;
  role: "admin" | "employer" | "jobseeker";
};

async function resolveActorMeta(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const meta = new Map<string, ActorMeta>();

  if (uniqueIds.length === 0) {
    return meta;
  }

  const [users, employers, admins] = await Promise.all([
    db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, uniqueIds)),
    db
      .select({ id: employersTable.id, name: employersTable.establishmentName })
      .from(employersTable)
      .where(inArray(employersTable.id, uniqueIds)),
    db
      .select({ id: adminsTable.id, name: adminsTable.name })
      .from(adminsTable)
      .where(inArray(adminsTable.id, uniqueIds)),
  ]);

  users.forEach((item) => {
    meta.set(item.id, { name: item.name, role: "jobseeker" });
  });

  employers.forEach((item) => {
    meta.set(item.id, { name: item.name, role: "employer" });
  });

  admins.forEach((item) => {
    meta.set(item.id, { name: item.name, role: "admin" });
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
    const peerId = searchParams.get("peerId");
    const before = searchParams.get("before");
    const limit = parseBoundedInt(searchParams.get("limit"), {
      fallback: 100,
      min: 1,
      max: 100,
    });

    if (!peerId) {
      const beforeDate = before ? new Date(before) : null;
      const isValidBefore = Boolean(beforeDate && !Number.isNaN(beforeDate.getTime()));

      const participantsCondition = or(
        eq(messagesTable.senderId, identity.userId),
        eq(messagesTable.recipientId, identity.userId)
      );

      const conversationsLimit = Math.min(limit, 100);
      const scanLimit = Math.min(Math.max(conversationsLimit * 20, conversationsLimit + 1), 500);

      const whereCondition = isValidBefore
        ? and(participantsCondition, lt(messagesTable.createdAt, beforeDate as Date))
        : participantsCondition;

      const rows = await db
        .select({
          id: messagesTable.id,
          senderId: messagesTable.senderId,
          recipientId: messagesTable.recipientId,
          content: messagesTable.content,
          read: messagesTable.read,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .where(whereCondition)
        .orderBy(desc(messagesTable.createdAt))
        .limit(scanLimit + 1);

      const hasAdditionalRows = rows.length > scanLimit;
      const scanRows = hasAdditionalRows ? rows.slice(0, scanLimit) : rows;

      const unreadCounts = new Map<string, number>();
      scanRows.forEach((item) => {
        const otherUserId =
          item.senderId === identity.userId ? item.recipientId : item.senderId;
        const isUnread = item.read !== true && item.recipientId === identity.userId;
        if (isUnread) {
          unreadCounts.set(otherUserId, (unreadCounts.get(otherUserId) ?? 0) + 1);
        }
      });

      const seen = new Set<string>();
      const orderedConversations = scanRows
        .map((item) => {
          const otherUserId =
            item.senderId === identity.userId ? item.recipientId : item.senderId;
          return {
            otherUserId,
            lastMessage: item.content,
            lastMessageAt: item.createdAt,
          };
        })
        .filter((item) => {
          if (seen.has(item.otherUserId)) return false;
          seen.add(item.otherUserId);
          return true;
        })
        .slice(0, conversationsLimit);

      const actorMeta = await resolveActorMeta(
        orderedConversations.map((item) => item.otherUserId)
      );

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
        ? new Date(conversations.at(-1)!.lastMessageAt).toISOString()
        : null;

      const hasMore =
        conversations.length === conversationsLimit &&
        (hasAdditionalRows || scanRows.length >= scanLimit);

      return NextResponse.json({
        conversations,
        page: {
          hasMore,
          nextBefore,
        },
        requestId,
      });
    }

    const threadCondition = or(
      and(eq(messagesTable.senderId, identity.userId), eq(messagesTable.recipientId, peerId)),
      and(eq(messagesTable.senderId, peerId), eq(messagesTable.recipientId, identity.userId))
    );

    const beforeDate = before ? new Date(before) : null;
    const isValidBefore = Boolean(beforeDate && !Number.isNaN(beforeDate.getTime()));

    const whereCondition = isValidBefore
      ? and(threadCondition, lt(messagesTable.createdAt, beforeDate as Date))
      : threadCondition;

    const rows = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        recipientId: messagesTable.recipientId,
        content: messagesTable.content,
        read: messagesTable.read,
        readAt: messagesTable.readAt,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(whereCondition)
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const messages = [...pageRows].reverse();
    const nextBefore = messages[0]?.createdAt ? new Date(messages[0].createdAt).toISOString() : null;

    return NextResponse.json({
      messages,
      page: {
        hasMore,
        nextBefore,
      },
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
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "x-ratelimit-remaining": String(rateLimit.remaining),
            "x-ratelimit-reset": String(rateLimit.resetInSeconds),
          },
        }
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
    if (payload.recipientId === identity.userId) {
      return NextResponse.json({ error: "Cannot message yourself", requestId }, { status: 400 });
    }

    const [created] = await db
      .insert(messagesTable)
      .values({
        senderId: identity.userId,
        recipientId: payload.recipientId,
        content: payload.content.trim(),
        read: false,
      })
      .returning({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        recipientId: messagesTable.recipientId,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
      });

    if (!created) {
      incrementRealtimeMetric("messages_send_failure");
      return NextResponse.json({ error: "Failed to send message", requestId }, { status: 500 });
    }

    incrementRealtimeMetric("messages_send_success");

    await tryCreateNotification({
      userId: payload.recipientId,
      role: payload.recipientRole,
      type: "message",
      title: "New Message",
      message: `${identity.name ?? "Someone"} sent you a message.`,
      relatedId: created.id,
      relatedType: "message",
    });

    return NextResponse.json(
      { message: "Message sent", data: created, requestId },
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
