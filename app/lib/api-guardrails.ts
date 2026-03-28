type RateLimitStoreEntry = {
  windowStartMs: number;
  count: number;
};

type RateLimitConfig = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __gwRateLimitStore: Map<string, RateLimitStoreEntry> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__gwRateLimitStore) {
    globalThis.__gwRateLimitStore = new Map<string, RateLimitStoreEntry>();
  }
  return globalThis.__gwRateLimitStore;
}

export function getRequestId(req: Request) {
  const incomingId = req.headers.get("x-request-id")?.trim();
  if (incomingId) {
    return incomingId.slice(0, 128);
  }

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function enforceRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const store = getRateLimitStore();
  const existing = store.get(config.key);

  if (!existing || now - existing.windowStartMs >= config.windowMs) {
    store.set(config.key, { windowStartMs: now, count: 1 });
    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - 1),
      resetInSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  existing.count += 1;
  store.set(config.key, existing);

  const elapsed = now - existing.windowStartMs;
  const resetInSeconds = Math.max(1, Math.ceil((config.windowMs - elapsed) / 1000));
  const remaining = Math.max(0, config.maxRequests - existing.count);

  return {
    allowed: existing.count <= config.maxRequests,
    remaining,
    resetInSeconds,
  };
}

export function parseBoundedInt(
  rawValue: string | null,
  options: { fallback: number; min: number; max: number }
) {
  if (rawValue === null || rawValue.trim() === "") {
    return options.fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return options.fallback;
  }

  const integer = Math.trunc(parsed);
  return Math.min(options.max, Math.max(options.min, integer));
}
