import { getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTypingSnapshotForUser } from "@/lib/message-typing-state";
import { adjustRealtimeMetric, incrementRealtimeMetric } from "@/lib/realtime-metrics";

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
  const { data: rows } = await db
    .from("messages")
    .select("id, sender_id, recipient_id, read, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    unreadCount: (rows || []).filter((item) => item.read !== true).length,
    latestMessageId: rows?.[0]?.id ?? null,
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
  let cleanupRef: (() => void) | null = null;
  const abortListener = () => {
    cleanupRef?.();
  };

  req.signal.addEventListener("abort", abortListener);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let messagePoller: ReturnType<typeof setInterval> | null = null;
      let typingPoller: ReturnType<typeof setInterval> | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
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
        adjustRealtimeMetric("messages_stream_active", -1);
        if (messagePoller) clearInterval(messagePoller);
        if (typingPoller) clearInterval(typingPoller);
        if (heartbeat) clearInterval(heartbeat);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        req.signal.removeEventListener("abort", abortListener);
        try {
          controller.close();
        } catch {
          // already closed by client/runtime
        }
      };

      cleanupRef = cleanup;

      const emit = (event: string, payload: unknown, eventId?: string) => {
        const idLine = eventId ? `id: ${eventId}\n` : "";
        const written = safeEnqueue(
          `${idLine}event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
        );
        if (!written) {
          cleanup();
        }
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
      incrementRealtimeMetric("messages_stream_connections");
      adjustRealtimeMetric("messages_stream_active", 1);

      let lastMessageSignature: string | null = null;
      messagePoller = setInterval(async () => {
        if (closed) return;
        try {
          const snapshot = await getMessageSnapshot(identity.userId);
          const signature = `${snapshot.latestMessageId ?? "none"}|${snapshot.unreadCount}`;
          if (signature !== lastMessageSignature) {
            lastMessageSignature = signature;
            emit("message", snapshot, makeEventId("message", snapshot.latestMessageId));
            emit("new", snapshot, makeEventId("message", snapshot.latestMessageId));
            incrementRealtimeMetric("messages_stream_emits");
          }
        } catch {
          incrementRealtimeMetric("messages_stream_errors");
          emit("error", { message: "stream_error" });
        }
      }, 6000);

      let lastTypingSignature = "";
      typingPoller = setInterval(() => {
        if (closed) return;

        const typingSnapshot = getTypingSnapshotForUser(identity.userId);
        if (typingSnapshot.signature !== lastTypingSignature) {
          lastTypingSignature = typingSnapshot.signature;
          emit("typing", typingSnapshot, makeEventId("typing", typingSnapshot.latestTypingKey));
        }
      }, 1200);

      heartbeat = setInterval(() => {
        if (closed) return;
        if (!safeEnqueue(`: ping\n\n`)) {
          cleanup();
        }
      }, 15000);

      try {
        const initial = await getMessageSnapshot(identity.userId);
        lastMessageSignature = `${initial.latestMessageId ?? "none"}|${initial.unreadCount}`;
        emit("message", initial, makeEventId("message", initial.latestMessageId));
        emit("seed", initial, makeEventId("message", initial.latestMessageId));
        incrementRealtimeMetric("messages_stream_emits");
      } catch {
        incrementRealtimeMetric("messages_stream_errors");
        emit("error", { message: "initial_snapshot_failed" });
      }

      const initialTypingSnapshot = getTypingSnapshotForUser(identity.userId);
      lastTypingSignature = initialTypingSnapshot.signature;
      emit("typing", initialTypingSnapshot, makeEventId("typing", initialTypingSnapshot.latestTypingKey));

      timeoutHandle = setTimeout(() => cleanup(), 120000);
    },
    cancel() {
      cleanupRef?.();
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