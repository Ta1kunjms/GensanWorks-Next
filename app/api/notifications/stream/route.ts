import { and, desc, eq } from "drizzle-orm";
import { getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustRealtimeMetric, incrementRealtimeMetric } from "@/lib/realtime-metrics";
import { notificationsTable } from "@/db/schema";

export const runtime = "nodejs";

function makeEventId(prefix: string, latestId: string | null) {
  return `${prefix}:${Date.now()}:${latestId ?? "none"}`;
}

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role as "admin" | "employer" | "jobseeker" };
}

async function getNotificationSnapshot(identity: { userId: string; role: "admin" | "employer" | "jobseeker" }) {
  const notifications = await db
    .select({
      id: notificationsTable.id,
      title: notificationsTable.title,
      read: notificationsTable.read,
      createdAt: notificationsTable.createdAt,
    })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, identity.userId),
        eq(notificationsTable.role, identity.role)
      )
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(20);

  const unreadCount = notifications.filter((item) => item.read !== true).length;
  const latestId = notifications[0]?.id ?? null;

  return {
    unreadCount,
    latestId,
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
      const writeEvent = (event: string, payload: unknown, eventId?: string) => {
        const idLine = eventId ? `id: ${eventId}\n` : "";
        controller.enqueue(
          encoder.encode(`${idLine}event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      writeEvent("connected", {
        ok: true,
        requestId,
        timestamp: new Date().toISOString(),
        recoveredFromEventId: lastEventId,
      });
      incrementRealtimeMetric("notifications_stream_connections");
      adjustRealtimeMetric("notifications_stream_active", 1);

      let closed = false;
      let lastSignature: string | null = null;
      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const snapshot = await getNotificationSnapshot(identity);
          const signature = `${snapshot.latestId ?? "none"}|${snapshot.unreadCount}`;
          if (signature !== lastSignature) {
            lastSignature = signature;
            writeEvent("notification", snapshot, makeEventId("notification", snapshot.latestId));
            incrementRealtimeMetric("notifications_stream_emits");
          }
        } catch {
          incrementRealtimeMetric("notifications_stream_errors");
          writeEvent("error", { message: "stream_error" });
        }
      }, 8000);

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        adjustRealtimeMetric("notifications_stream_active", -1);
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // stream already closed by client
        }
      };

      // Send initial payload immediately
      try {
        const initialSnapshot = await getNotificationSnapshot(identity);
        lastSignature = `${initialSnapshot.latestId ?? "none"}|${initialSnapshot.unreadCount}`;
        writeEvent(
          "notification",
          initialSnapshot,
          makeEventId("notification", initialSnapshot.latestId)
        );
        incrementRealtimeMetric("notifications_stream_emits");
      } catch {
        incrementRealtimeMetric("notifications_stream_errors");
        writeEvent("error", { message: "initial_snapshot_failed" });
      }

      // Keep connection max 2 minutes; client auto-reconnects
      setTimeout(() => cleanup(), 120000);
    },
    cancel() {
      // handled by timeout/close attempts
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
