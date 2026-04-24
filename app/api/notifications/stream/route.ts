import { getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adjustRealtimeMetric, incrementRealtimeMetric } from "@/lib/realtime-metrics";

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
  const { data: notifications } = await db
    .from("notifications")
    .select("id, title, read, created_at")
    .eq("user_id", identity.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    unreadCount: (notifications || []).filter((n) => n.read !== true).length,
    latestNotificationId: notifications?.[0]?.id ?? null,
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
      let closed = false;
      let poller: ReturnType<typeof setInterval> | null = null;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const safeEnqueue = (payload: string) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(payload));
          return true;
        } catch {
          return false;
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        adjustRealtimeMetric("notifications_stream_active", -1);
        if (poller) clearInterval(poller);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        try {
          controller.close();
        } catch {}
      };

      const emit = (event: string, payload: unknown, eventId?: string) => {
        const idLine = eventId ? `id: ${eventId}\n` : "";
        const written = safeEnqueue(
          `${idLine}event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
        );
        if (!written) cleanup();
      };

      if (!safeEnqueue("retry: 3000\n\n")) {
        cleanup();
        return;
      }

      emit("connected", {
        ok: true,
        requestId,
        timestamp: new Date().toISOString(),
        recoveredFromEventId: lastEventId,
      });

      incrementRealtimeMetric("notifications_stream_connections");
      adjustRealtimeMetric("notifications_stream_active", 1);

      let lastSignature: string | null = null;
      poller = setInterval(async () => {
        if (closed) return;
        try {
          const snapshot = await getNotificationSnapshot(identity);
          const signature = `${snapshot.latestNotificationId ?? "none"}|${snapshot.unreadCount}`;
          if (signature !== lastSignature) {
            lastSignature = signature;
            emit("notification", snapshot, makeEventId("notification", snapshot.latestNotificationId));
            emit("new", snapshot, makeEventId("notification", snapshot.latestNotificationId));
            incrementRealtimeMetric("notifications_stream_emits");
          }
        } catch {
          incrementRealtimeMetric("notifications_stream_errors");
          emit("error", { message: "stream_error" });
        }
      }, 5000);

      try {
        const initial = await getNotificationSnapshot(identity);
        lastSignature = `${initial.latestNotificationId ?? "none"}|${initial.unreadCount}`;
        emit("notification", initial, makeEventId("notification", initial.latestNotificationId));
        emit("seed", initial, makeEventId("notification", initial.latestNotificationId));
        incrementRealtimeMetric("notifications_stream_emits");
      } catch {
        incrementRealtimeMetric("notifications_stream_errors");
        emit("error", { message: "initial_snapshot_failed" });
      }

      timeoutHandle = setTimeout(() => cleanup(), 120000);
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}