import { desc, eq } from "drizzle-orm";
import { getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustRealtimeMetric, incrementRealtimeMetric } from "@/lib/realtime-metrics";
import { messagesTable } from "@/db/schema";

export const runtime = "nodejs";

function makeEventId(prefix: string, latestId: string | null) {
  return `${prefix}:${Date.now()}:${latestId ?? "none"}`;
}

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id };
}

async function getMessageSnapshot(userId: string) {
  const rows = await db
    .select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      read: messagesTable.read,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .where(eq(messagesTable.recipientId, userId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(20);

  return {
    unreadCount: rows.filter((item) => item.read !== true).length,
    latestMessageId: rows[0]?.id ?? null,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const identity = await getSessionIdentity();
  if (!identity) {
    return new Response("Unauthorized", { status: 401 });
  }

  const lastEventId = req.headers.get("last-event-id");

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, payload: unknown, eventId?: string) => {
        const idLine = eventId ? `id: ${eventId}\n` : "";
        controller.enqueue(
          encoder.encode(`${idLine}event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      emit("connected", {
        ok: true,
        requestId,
        timestamp: new Date().toISOString(),
        recoveredFromEventId: lastEventId,
      });
      incrementRealtimeMetric("messages_stream_connections");
      adjustRealtimeMetric("messages_stream_active", 1);

      let closed = false;
      let lastSignature: string | null = null;
      const poller = setInterval(async () => {
        if (closed) return;
        try {
          const snapshot = await getMessageSnapshot(identity.userId);
          const signature = `${snapshot.latestMessageId ?? "none"}|${snapshot.unreadCount}`;
          if (signature !== lastSignature) {
            lastSignature = signature;
            emit("message", snapshot, makeEventId("message", snapshot.latestMessageId));
            incrementRealtimeMetric("messages_stream_emits");
          }
        } catch {
          incrementRealtimeMetric("messages_stream_errors");
          emit("error", { message: "stream_error" });
        }
      }, 6000);

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        adjustRealtimeMetric("messages_stream_active", -1);
        clearInterval(poller);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      try {
        const initial = await getMessageSnapshot(identity.userId);
        lastSignature = `${initial.latestMessageId ?? "none"}|${initial.unreadCount}`;
        emit("message", initial, makeEventId("message", initial.latestMessageId));
        incrementRealtimeMetric("messages_stream_emits");
      } catch {
        incrementRealtimeMetric("messages_stream_errors");
        emit("error", { message: "initial_snapshot_failed" });
      }

      setTimeout(() => cleanup(), 120000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
