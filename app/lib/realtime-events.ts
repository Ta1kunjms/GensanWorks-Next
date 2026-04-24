import { EventEmitter } from "node:events";

export type RealtimeEventPayloadMap = {
  "message:new": {
    messageId: string;
    senderId: string;
    recipientId: string;
    createdAt: string;
  };
  "message:read": {
    messageIds: string[];
    readerId: string;
    readAt: string;
  };
  "message:typing": {
    sourceUserId: string;
    sourceUserName: string | null;
    isTyping: boolean;
    updatedAt: string;
  };
  "notification:update": {
    notificationId?: string | null;
    unreadCount?: number;
    timestamp: string;
  };
};

export type RealtimeServerEvent = {
  [K in keyof RealtimeEventPayloadMap]: {
    type: K;
    userId: string;
    payload: RealtimeEventPayloadMap[K];
  };
}[keyof RealtimeEventPayloadMap];

type RealtimeEmitter = EventEmitter & {
  on(event: "realtime", listener: (event: RealtimeServerEvent) => void): RealtimeEmitter;
  off(event: "realtime", listener: (event: RealtimeServerEvent) => void): RealtimeEmitter;
  emit(event: "realtime", eventPayload: RealtimeServerEvent): boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __gwRealtimeEmitter: RealtimeEmitter | undefined;
}

function getEmitter() {
  if (!globalThis.__gwRealtimeEmitter) {
    const emitter = new EventEmitter() as RealtimeEmitter;
    emitter.setMaxListeners(200);
    globalThis.__gwRealtimeEmitter = emitter;
  }

  return globalThis.__gwRealtimeEmitter;
}

export function publishRealtimeEvent(event: RealtimeServerEvent) {
  getEmitter().emit("realtime", event);
}

export function subscribeRealtimeEvents(listener: (event: RealtimeServerEvent) => void) {
  const emitter = getEmitter();
  emitter.on("realtime", listener);

  return () => {
    emitter.off("realtime", listener);
  };
}
