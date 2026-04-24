type RealtimeMetricKey =
  | "messages_stream_connections"
  | "messages_stream_active"
  | "messages_stream_errors"
  | "messages_stream_emits"
  | "notifications_stream_connections"
  | "notifications_stream_active"
  | "notifications_stream_errors"
  | "notifications_stream_emits"
  | "messages_send_success"
  | "messages_send_failure"
  | "messages_read_updates"
  | "notifications_email_sent"
  | "notifications_email_failed"
  | "notifications_sms_sent"
  | "notifications_sms_failed";

type RealtimeMetricsStore = {
  counters: Record<RealtimeMetricKey, number>;
  lastUpdatedAt: string;
};

const defaultCounters: Record<RealtimeMetricKey, number> = {
  messages_stream_connections: 0,
  messages_stream_active: 0,
  messages_stream_errors: 0,
  messages_stream_emits: 0,
  notifications_stream_connections: 0,
  notifications_stream_active: 0,
  notifications_stream_errors: 0,
  notifications_stream_emits: 0,
  messages_send_success: 0,
  messages_send_failure: 0,
  messages_read_updates: 0,
  notifications_email_sent: 0,
  notifications_email_failed: 0,
  notifications_sms_sent: 0,
  notifications_sms_failed: 0,
};

declare global {
  // eslint-disable-next-line no-var
  var __gwRealtimeMetrics: RealtimeMetricsStore | undefined;
}

function getStore() {
  if (!globalThis.__gwRealtimeMetrics) {
    globalThis.__gwRealtimeMetrics = {
      counters: { ...defaultCounters },
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  return globalThis.__gwRealtimeMetrics;
}

function touch(store: RealtimeMetricsStore) {
  store.lastUpdatedAt = new Date().toISOString();
}

export function incrementRealtimeMetric(key: RealtimeMetricKey, amount = 1) {
  const store = getStore();
  store.counters[key] += amount;
  touch(store);
}

export function adjustRealtimeMetric(key: RealtimeMetricKey, delta: number) {
  const store = getStore();
  const nextValue = store.counters[key] + delta;
  store.counters[key] = nextValue > 0 ? nextValue : 0;
  touch(store);
}

export function getRealtimeMetricsSnapshot() {
  const store = getStore();
  return {
    generatedAt: new Date().toISOString(),
    lastUpdatedAt: store.lastUpdatedAt,
    counters: { ...store.counters },
  };
}
