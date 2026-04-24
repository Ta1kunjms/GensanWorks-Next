import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.PHASE5_BASE_URL;
const jobseekerCookie = process.env.PHASE5_JOBSEEKER_COOKIE;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error("PHASE5_BASE_URL is not set");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await fetch(baseUrl);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delay(1_000);
      }
    }
  }

  throw new Error(`Phase 5 smoke server is unreachable${lastError ? `: ${String(lastError)}` : ""}`);
}

async function assertSseHandshake(pathname: string, cookie: string) {
  if (!baseUrl) {
    throw new Error("PHASE5_BASE_URL is not set");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl}${pathname}`, {
      headers: {
        Accept: "text/event-stream",
        Cookie: cookie,
      },
      signal: controller.signal,
    });

    assert.equal(res.status, 200);
    assert.ok((res.headers.get("content-type") ?? "").includes("text/event-stream"));
    assert.ok(res.body);

    const reader = res.body.getReader();
    const firstChunk = await reader.read();
    assert.equal(firstChunk.done, false);
    assert.ok((firstChunk.value?.length ?? 0) > 0);
    await reader.cancel();
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }
}

describe("phase-5 messaging and notifications", () => {
  runOrSkip("GET /api/messages rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/messages`);
    assert.equal(res.status, 401);
  });

  runOrSkip("POST /api/messages rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipientId: "00000000-0000-0000-0000-000000000001",
        recipientRole: "jobseeker",
        content: "hello",
      }),
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("POST /api/messages/typing rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/messages/typing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        peerId: "00000000-0000-0000-0000-000000000001",
        isTyping: true,
      }),
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("PATCH /api/messages/read rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/messages/read`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        peerId: "00000000-0000-0000-0000-000000000001",
      }),
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/messages/stream rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/messages/stream`, {
      headers: { Accept: "text/event-stream" },
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/realtime/socket-session rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/realtime/socket-session`);
    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/notifications rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/notifications`);
    assert.equal(res.status, 401);
  });

  runOrSkip("POST /api/notifications rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Smoke notification",
        message: "notification smoke check",
      }),
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("PATCH /api/notifications/mark-all-read rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
      method: "PATCH",
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("PATCH /api/notifications/[id] rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/notifications/00000000-0000-0000-0000-000000000001`, {
      method: "PATCH",
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/notifications/stream rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/notifications/stream`, {
      headers: { Accept: "text/event-stream" },
    });

    assert.equal(res.status, 401);
  });

  runOrSkip("GET /api/contacts rejects anonymous caller", async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/contacts?limit=5`);
    assert.equal(res.status, 401);
  });

  runOrSkip("Authenticated jobseeker can list conversations and notifications", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE5_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const conversationsRes = await fetch(`${baseUrl}/api/messages?limit=5`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(conversationsRes.status, 200);

    const conversationsBody = (await conversationsRes.json()) as {
      conversations?: unknown[];
      page?: { hasMore?: boolean; nextBefore?: string | null };
      requestId?: string;
    };
    assert.equal(Array.isArray(conversationsBody.conversations), true);
    assert.equal(typeof conversationsBody.requestId, "string");

    const searchedConversationsRes = await fetch(`${baseUrl}/api/messages?limit=5&q=smoke`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(searchedConversationsRes.status, 200);
    const searchedConversationsBody = (await searchedConversationsRes.json()) as {
      conversations?: unknown[];
      requestId?: string;
    };
    assert.equal(Array.isArray(searchedConversationsBody.conversations), true);
    assert.equal(typeof searchedConversationsBody.requestId, "string");

    const threadRes = await fetch(
      `${baseUrl}/api/messages?user_id=00000000-0000-0000-0000-000000000123&limit=5`,
      {
        headers: { Cookie: jobseekerCookie },
      }
    );
    assert.equal(threadRes.status, 200);
    const threadBody = (await threadRes.json()) as {
      messages?: unknown[];
      page?: { hasMore?: boolean; nextBefore?: string | null };
      requestId?: string;
    };
    assert.equal(Array.isArray(threadBody.messages), true);

    const searchedThreadRes = await fetch(
      `${baseUrl}/api/messages?peerId=00000000-0000-0000-0000-000000000123&limit=5&q=hello`,
      {
        headers: { Cookie: jobseekerCookie },
      }
    );
    assert.equal(searchedThreadRes.status, 200);
    const searchedThreadBody = (await searchedThreadRes.json()) as {
      messages?: unknown[];
      requestId?: string;
    };
    assert.equal(Array.isArray(searchedThreadBody.messages), true);
    assert.equal(typeof searchedThreadBody.requestId, "string");

    const notificationsRes = await fetch(`${baseUrl}/api/notifications?limit=10`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(notificationsRes.status, 200);

    const notificationsBody = (await notificationsRes.json()) as {
      notifications?: Array<{ id: string; read?: boolean }>;
      unreadCount?: number;
      requestId?: string;
    };
    assert.equal(Array.isArray(notificationsBody.notifications), true);
    assert.equal(typeof notificationsBody.unreadCount, "number");

    const contactsRes = await fetch(`${baseUrl}/api/contacts?limit=5`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(contactsRes.status, 200);

    const contactsBody = (await contactsRes.json()) as { contacts?: unknown[] };
    assert.equal(Array.isArray(contactsBody.contacts), true);
  });

  runOrSkip("Authenticated jobseeker can create and mark a notification", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE5_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const createRes = await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: jobseekerCookie,
      },
      body: JSON.stringify({
        title: "Phase 5 smoke",
        message: "create + read route verification",
        type: "system",
      }),
    });

    assert.equal(createRes.status, 201);
    const createBody = (await createRes.json()) as {
      notificationId?: string | null;
      requestId?: string;
    };
    assert.equal(typeof createBody.requestId, "string");
    assert.equal(typeof createBody.notificationId, "string");

    const markOneRes = await fetch(`${baseUrl}/api/notifications/${createBody.notificationId}`, {
      method: "PATCH",
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(markOneRes.status, 200);

    const markAllRes = await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
      method: "PATCH",
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(markAllRes.status, 200);
  });

  runOrSkip("Authenticated jobseeker can establish SSE handshakes", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE5_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    await assertSseHandshake("/api/messages/stream", jobseekerCookie);
    await assertSseHandshake("/api/notifications/stream", jobseekerCookie);
  });

  runOrSkip("Authenticated jobseeker can toggle typing status", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE5_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const typingOnRes = await fetch(`${baseUrl}/api/messages/typing`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: jobseekerCookie,
      },
      body: JSON.stringify({
        peerId: "00000000-0000-0000-0000-000000000123",
        isTyping: true,
      }),
    });

    assert.equal(typingOnRes.status, 200);
    const typingOnBody = (await typingOnRes.json()) as {
      ok?: boolean;
      isTyping?: boolean;
      peerId?: string;
      requestId?: string;
    };
    assert.equal(typingOnBody.ok, true);
    assert.equal(typingOnBody.isTyping, true);
    assert.equal(typeof typingOnBody.requestId, "string");

    const typingOffRes = await fetch(`${baseUrl}/api/messages/typing`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: jobseekerCookie,
      },
      body: JSON.stringify({
        peerId: "00000000-0000-0000-0000-000000000123",
        isTyping: false,
      }),
    });

    assert.equal(typingOffRes.status, 200);
    const typingOffBody = (await typingOffRes.json()) as {
      ok?: boolean;
      isTyping?: boolean;
      requestId?: string;
    };
    assert.equal(typingOffBody.ok, true);
    assert.equal(typingOffBody.isTyping, false);
    assert.equal(typeof typingOffBody.requestId, "string");
  });

  runOrSkip("Authenticated jobseeker can request realtime socket session", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE5_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/realtime/socket-session`, {
      headers: { Cookie: jobseekerCookie },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      token?: string;
      userId?: string;
      role?: string;
      expiresInSeconds?: number;
      requestId?: string;
    };

    assert.equal(typeof body.token, "string");
    assert.ok((body.token?.split(".").length ?? 0) === 2);
    assert.equal(typeof body.userId, "string");
    assert.equal(typeof body.role, "string");
    assert.equal(typeof body.expiresInSeconds, "number");
    assert.equal(typeof body.requestId, "string");
  });

  runOrSkip("Authenticated jobseeker mark-read response includes readAt metadata", async (t) => {
    if (!jobseekerCookie) {
      t.skip("PHASE5_JOBSEEKER_COOKIE not provided");
      return;
    }

    try {
      await ensureServerReachable();
    } catch {
      t.skip("Phase 5 smoke server is unreachable");
      return;
    }

    const res = await fetch(`${baseUrl}/api/messages/read`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Cookie: jobseekerCookie,
      },
      body: JSON.stringify({
        messageIds: ["00000000-0000-0000-0000-000000000001"],
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      updatedCount?: number;
      readAt?: string | null;
      unreadCount?: number;
      requestId?: string;
    };

    assert.equal(typeof body.updatedCount, "number");
    assert.ok(body.readAt === null || typeof body.readAt === "string");
    assert.equal(typeof body.unreadCount, "number");
    assert.equal(typeof body.requestId, "string");
  });
});
