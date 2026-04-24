import { createHmac, timingSafeEqual } from "node:crypto";

export type RealtimeSocketRole = "admin" | "employer" | "jobseeker";

export type RealtimeSocketTokenPayload = {
  userId: string;
  role: RealtimeSocketRole;
  iat: number;
  exp: number;
  v: 1;
};

type SignRealtimeSocketTokenInput = {
  userId: string;
  role: RealtimeSocketRole;
  ttlSeconds?: number;
};

const DEFAULT_TTL_SECONDS = 300;

function getSigningSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null;
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function signRealtimeSocketToken(input: SignRealtimeSocketTokenInput) {
  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + Math.max(30, input.ttlSeconds ?? DEFAULT_TTL_SECONDS);

  const payload: RealtimeSocketTokenPayload = {
    userId: input.userId,
    role: input.role,
    iat: issuedAt,
    exp: expiresAt,
    v: 1,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyRealtimeSocketToken(token: string) {
  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  if (!safeEquals(signature, expectedSignature)) {
    return null;
  }

  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(decoded) as Partial<RealtimeSocketTokenPayload>;

    if (
      payload.v !== 1 ||
      typeof payload.userId !== "string" ||
      payload.userId.length === 0 ||
      (payload.role !== "admin" && payload.role !== "employer" && payload.role !== "jobseeker") ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload as RealtimeSocketTokenPayload;
  } catch {
    return null;
  }
}
