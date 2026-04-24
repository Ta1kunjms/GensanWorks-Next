type TypingEntry = {
  sourceUserId: string;
  sourceUserName: string | null;
  targetUserId: string;
  updatedAtMs: number;
  expiresAtMs: number;
};

type TypingSnapshot = {
  typers: Array<{
    sourceUserId: string;
    sourceUserName: string | null;
    updatedAt: string;
  }>;
  signature: string;
  latestTypingKey: string | null;
  timestamp: string;
};

const TYPING_TTL_MS = 12_000;
const MAX_TYPING_ENTRIES = 2_000;

declare global {
  // eslint-disable-next-line no-var
  var __gwMessageTypingStore: Map<string, TypingEntry> | undefined;
}

function getStore() {
  if (!globalThis.__gwMessageTypingStore) {
    globalThis.__gwMessageTypingStore = new Map<string, TypingEntry>();
  }

  return globalThis.__gwMessageTypingStore;
}

function makeKey(sourceUserId: string, targetUserId: string) {
  return `${sourceUserId}::${targetUserId}`;
}

function pruneExpired(nowMs: number) {
  const store = getStore();
  for (const [key, value] of store.entries()) {
    if (value.expiresAtMs <= nowMs) {
      store.delete(key);
    }
  }

  if (store.size <= MAX_TYPING_ENTRIES) {
    return;
  }

  const sortedByUpdatedAt = [...store.entries()].sort((a, b) => b[1].updatedAtMs - a[1].updatedAtMs);
  const retained = sortedByUpdatedAt.slice(0, MAX_TYPING_ENTRIES);
  store.clear();
  retained.forEach(([key, value]) => {
    store.set(key, value);
  });
}

export function setTypingState(input: {
  sourceUserId: string;
  sourceUserName?: string | null;
  targetUserId: string;
  isTyping: boolean;
}) {
  const nowMs = Date.now();
  pruneExpired(nowMs);

  const store = getStore();
  const key = makeKey(input.sourceUserId, input.targetUserId);

  if (!input.isTyping) {
    store.delete(key);
    return;
  }

  store.set(key, {
    sourceUserId: input.sourceUserId,
    sourceUserName: input.sourceUserName ?? null,
    targetUserId: input.targetUserId,
    updatedAtMs: nowMs,
    expiresAtMs: nowMs + TYPING_TTL_MS,
  });
}

export function getTypingSnapshotForUser(targetUserId: string): TypingSnapshot {
  const nowMs = Date.now();
  pruneExpired(nowMs);

  const store = getStore();
  const entries = [...store.values()]
    .filter((entry) => entry.targetUserId === targetUserId)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

  const typers = entries.map((entry) => ({
    sourceUserId: entry.sourceUserId,
    sourceUserName: entry.sourceUserName,
    updatedAt: new Date(entry.updatedAtMs).toISOString(),
  }));

  const signature = entries
    .map((entry) => `${entry.sourceUserId}:${entry.updatedAtMs}`)
    .join("|");

  const latestTypingKey = entries[0]
    ? `${entries[0].sourceUserId}:${entries[0].updatedAtMs}`
    : null;

  return {
    typers,
    signature,
    latestTypingKey,
    timestamp: new Date(nowMs).toISOString(),
  };
}

export function getTypingTtlMs() {
  return TYPING_TTL_MS;
}
