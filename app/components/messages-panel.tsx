"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  read: boolean | null;
  readAt: string | null;
  createdAt: string;
  localStatus?: "sending" | "failed";
};

type ThreadResponse = {
  messages: Message[];
  page?: {
    hasMore?: boolean;
    nextBefore?: string | null;
  };
  currentUserId?: string;
};

type MarkReadResponse = {
  updatedIds?: string[];
  readAt?: string | null;
};

type TypingSnapshotResponse = {
  typers?: Array<{
    sourceUserId: string;
    sourceUserName: string | null;
    updatedAt: string;
  }>;
};

type SocketSessionResponse = {
  token?: string;
  role?: "admin" | "employer" | "jobseeker";
  userId?: string;
  expiresInSeconds?: number;
};

type MessageReadRealtimePayload = {
  messageIds?: string[];
  readerId?: string;
  readAt?: string;
};

type MessageTypingRealtimePayload = {
  sourceUserId?: string;
  sourceUserName?: string | null;
  isTyping?: boolean;
  updatedAt?: string;
};

type Conversation = {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: "admin" | "employer" | "jobseeker";
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type ConversationsResponse = {
  conversations: Conversation[];
  page?: {
    hasMore?: boolean;
    nextBefore?: string | null;
  };
};

type Contact = {
  id: string;
  role: "admin" | "employer" | "jobseeker";
  name: string;
  email: string | null;
};

type ThreadRenderItem =
  | { type: "day"; key: string; label: string }
  | { type: "unread"; key: string }
  | { type: "message"; key: string; message: Message };

export function MessagesPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePeerId, setActivePeerId] = useState("");
  const [activePeerRole, setActivePeerRole] = useState<"admin" | "employer" | "jobseeker">("jobseeker");
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadBefore, setThreadBefore] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversationsBefore, setConversationsBefore] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const [showUnreadConversationsOnly, setShowUnreadConversationsOnly] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [contactRole, setContactRole] = useState<"all" | "admin" | "employer" | "jobseeker">("all");
  const [threadQueryInput, setThreadQueryInput] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const [threadUnreadOnly, setThreadUnreadOnly] = useState(false);
  const [typingPeerIds, setTypingPeerIds] = useState<string[]>([]);
  const [typingPeerNames, setTypingPeerNames] = useState<Record<string, string | null>>({});
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const typingHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingPeerRef = useRef("");

  const loadConversations = useCallback(async (options?: { before?: string | null; append?: boolean }) => {
    try {
      const query = new URLSearchParams();
      query.set("limit", "20");
      if (options?.before) {
        query.set("before", options.before);
      }

      const response = await fetch(`/api/messages?${query.toString()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as ConversationsResponse;
      const nextConversations = data.conversations ?? [];

      setConversations((prev) => {
        if (!options?.append) {
          return nextConversations;
        }

        const merged = [...prev, ...nextConversations];
        const deduped = new Map<string, Conversation>();
        merged.forEach((conversation) => {
          if (!deduped.has(conversation.otherUserId)) {
            deduped.set(conversation.otherUserId, conversation);
          }
        });

        return Array.from(deduped.values());
      });

      setConversationsBefore(data.page?.nextBefore ?? null);
      setHasMoreConversations(Boolean(data.page?.hasMore));

      const firstConversation = nextConversations[0];
      if (!activePeerId && firstConversation) {
        setActivePeerId(firstConversation.otherUserId);
        setActivePeerRole(firstConversation.otherUserRole);
      }
    } catch {
      // ignore load failure
    }
  }, [activePeerId]);

  const loadMoreConversations = useCallback(async () => {
    if (!conversationsBefore || !hasMoreConversations || loadingMoreConversations) {
      return;
    }

    try {
      setLoadingMoreConversations(true);
      await loadConversations({ before: conversationsBefore, append: true });
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [conversationsBefore, hasMoreConversations, loadConversations, loadingMoreConversations]);

  const loadThread = useCallback(async (peerId: string, options?: { before?: string | null; append?: boolean }) => {
    if (!peerId) {
      setMessages([]);
      setThreadBefore(null);
      setHasOlderMessages(false);
      return;
    }

    try {
      const query = new URLSearchParams();
      query.set("peerId", peerId);
      query.set("limit", "50");
      if (options?.before) {
        query.set("before", options.before);
      }
      if (threadQuery) {
        query.set("q", threadQuery);
      }

      const response = await fetch(`/api/messages?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as ThreadResponse;
      const nextMessages = data.messages ?? [];
      setMessages((prev) => (options?.append ? [...nextMessages, ...prev] : nextMessages));
      setThreadBefore(data.page?.nextBefore ?? null);
      setHasOlderMessages(Boolean(data.page?.hasMore));
      if (data.currentUserId) {
        setCurrentUserId(data.currentUserId);
      }

      const resolvedCurrentUserId = data.currentUserId ?? currentUserId;
      const unreadIncomingIds = nextMessages
        .filter((message) => message.senderId !== resolvedCurrentUserId && !message.read)
        .map((message) => message.id);

      if (unreadIncomingIds.length > 0) {
        const markReadResponse = await fetch("/api/messages/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: unreadIncomingIds }),
        });

        if (markReadResponse.ok) {
          const markReadData = (await markReadResponse.json()) as MarkReadResponse;
          const updatedSet = new Set(markReadData.updatedIds ?? unreadIncomingIds);
          const resolvedReadAt = markReadData.readAt ?? new Date().toISOString();
          setMessages((prev) =>
            prev.map((message) =>
              updatedSet.has(message.id) ? { ...message, read: true, readAt: resolvedReadAt } : message
            )
          );
        }
      }
    } catch {
      // ignore load failure
    }
  }, [currentUserId, threadQuery]);

  const loadOlderMessages = useCallback(async () => {
    if (!activePeerId || !threadBefore || !hasOlderMessages || loadingOlder) {
      return;
    }

    const container = threadContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    try {
      setLoadingOlder(true);
      await loadThread(activePeerId, { before: threadBefore, append: true });
    } finally {
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = previousScrollTop + (container.scrollHeight - previousScrollHeight);
        });
      }
      setLoadingOlder(false);
    }
  }, [activePeerId, hasOlderMessages, loadThread, loadingOlder, threadBefore]);

  const sendMessageRequest = useCallback(
    async (recipientId: string, recipientRole: "admin" | "employer" | "jobseeker", content: string) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          recipientRole,
          content,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send message");
      }
    },
    []
  );

  const postTypingSignal = useCallback(async (peerId: string, isTyping: boolean) => {
    if (!peerId.trim()) {
      return;
    }

    try {
      await fetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId, isTyping }),
      });
    } catch {
      // ignore typing signal failure
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      query.set("limit", "50");
      query.set("role", contactRole);
      if (contactQuery.trim()) {
        query.set("q", contactQuery.trim());
      }

      const response = await fetch(`/api/contacts?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = (await response.json()) as { contacts: Contact[] };
      setContacts(data.contacts ?? []);
    } catch {
      // ignore load failure
    }
  }, [contactQuery, contactRole]);

  useEffect(() => {
    let source: EventSource | null = null;
    let socket: Socket | null = null;
    let disposed = false;

    const attachSseFallback = () => {
      if (source || disposed) {
        return;
      }

      source = new EventSource("/api/messages/stream");
      source.addEventListener("message", () => {
        void loadConversations({ append: false });
        if (activePeerId) {
          void loadThread(activePeerId, { append: false });
        }
      });

      source.addEventListener("typing", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data ?? "{}") as TypingSnapshotResponse;
          const nextIds = new Set<string>();
          const nextNames: Record<string, string | null> = {};

          (payload.typers ?? []).forEach((typer) => {
            if (!typer?.sourceUserId) {
              return;
            }

            nextIds.add(typer.sourceUserId);
            nextNames[typer.sourceUserId] = typer.sourceUserName ?? null;
          });

          setTypingPeerIds(Array.from(nextIds));
          setTypingPeerNames(nextNames);
        } catch {
          // ignore malformed typing event payload
        }
      });

      source.onerror = () => {
        void loadConversations({ append: false });
      };
    };

    const init = async () => {
      setLoading(true);
      await loadConversations({ append: false });
      setLoading(false);

      try {
        await fetch("/api/socketio", { cache: "no-store" });
        const sessionResponse = await fetch("/api/realtime/socket-session", { cache: "no-store" });

        if (!sessionResponse.ok) {
          throw new Error("Realtime socket session unavailable");
        }

        const session = (await sessionResponse.json()) as SocketSessionResponse;
        if (!session.token) {
          throw new Error("Realtime socket token unavailable");
        }

        socket = io({
          path: "/api/socketio",
          transports: ["websocket", "polling"],
          auth: {
            token: session.token,
          },
        });

        socket.on("message:new", () => {
          void loadConversations({ append: false });
          if (activePeerId) {
            void loadThread(activePeerId, { append: false });
          }
        });

        socket.on("message:typing", (payload: MessageTypingRealtimePayload) => {
          if (!payload?.sourceUserId) {
            return;
          }

          if (payload.isTyping) {
            setTypingPeerIds((prev) =>
              prev.includes(payload.sourceUserId as string) ? prev : [...prev, payload.sourceUserId as string]
            );
            setTypingPeerNames((prev) => ({
              ...prev,
              [payload.sourceUserId as string]: payload.sourceUserName ?? prev[payload.sourceUserId as string] ?? null,
            }));
            return;
          }

          setTypingPeerIds((prev) => prev.filter((peerId) => peerId !== payload.sourceUserId));
        });

        socket.on("message:read", (payload: MessageReadRealtimePayload) => {
          const readIds = payload.messageIds ?? [];
          if (readIds.length === 0) {
            return;
          }

          const readAt = payload.readAt ?? new Date().toISOString();
          const readIdSet = new Set(readIds);
          setMessages((prev) =>
            prev.map((message) =>
              readIdSet.has(message.id)
                ? {
                    ...message,
                    read: true,
                    readAt,
                  }
                : message
            )
          );
          void loadConversations({ append: false });
        });

        socket.on("connect_error", () => {
          attachSseFallback();
        });

        socket.on("disconnect", (reason) => {
          if (reason !== "io client disconnect") {
            attachSseFallback();
          }
        });
      } catch {
        attachSseFallback();
      }
    };

    void init();

    return () => {
      disposed = true;
      if (source) {
        source.close();
      }

      if (socket) {
        socket.disconnect();
      }
    };
  }, [activePeerId, loadConversations, loadThread]);

  useEffect(() => {
    if (activePeerId) {
      void loadThread(activePeerId, { append: false });
    }
  }, [activePeerId, loadThread]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setThreadQuery(threadQueryInput.trim());
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [threadQueryInput]);

  useEffect(() => {
    const activePeer = activePeerId.trim();

    const stopTypingHeartbeat = () => {
      if (typingHeartbeatRef.current) {
        clearInterval(typingHeartbeatRef.current);
        typingHeartbeatRef.current = null;
      }
    };

    const clearActiveTyping = () => {
      if (isTypingRef.current && lastTypingPeerRef.current) {
        void postTypingSignal(lastTypingPeerRef.current, false);
      }
      isTypingRef.current = false;
    };

    if (!activePeer) {
      clearActiveTyping();
      lastTypingPeerRef.current = "";
      stopTypingHeartbeat();
      return;
    }

    if (lastTypingPeerRef.current && lastTypingPeerRef.current !== activePeer) {
      clearActiveTyping();
      stopTypingHeartbeat();
    }

    const hasDraftMessage = messageText.trim().length > 0;
    if (hasDraftMessage) {
      if (!isTypingRef.current || lastTypingPeerRef.current !== activePeer) {
        void postTypingSignal(activePeer, true);
        isTypingRef.current = true;
      }

      lastTypingPeerRef.current = activePeer;

      if (!typingHeartbeatRef.current) {
        typingHeartbeatRef.current = setInterval(() => {
          if (isTypingRef.current && lastTypingPeerRef.current) {
            void postTypingSignal(lastTypingPeerRef.current, true);
          }
        }, 4000);
      }

      return;
    }

    if (isTypingRef.current && lastTypingPeerRef.current === activePeer) {
      void postTypingSignal(activePeer, false);
      isTypingRef.current = false;
    }

    stopTypingHeartbeat();
  }, [activePeerId, messageText, postTypingSignal]);

  useEffect(() => {
    return () => {
      if (typingHeartbeatRef.current) {
        clearInterval(typingHeartbeatRef.current);
      }

      if (isTypingRef.current && lastTypingPeerRef.current) {
        void postTypingSignal(lastTypingPeerRef.current, false);
      }
    };
  }, [postTypingSignal]);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      ),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = conversationQuery.trim().toLowerCase();

    return sortedConversations.filter((conversation) => {
      if (showUnreadConversationsOnly && conversation.unreadCount <= 0) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [conversation.otherUserName, conversation.otherUserRole, conversation.lastMessage]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [conversationQuery, showUnreadConversationsOnly, sortedConversations]);

  const refreshMessages = async () => {
    await loadConversations({ append: false });
    if (activePeerId) {
      await loadThread(activePeerId, { append: false });
    }
  };

  const visibleMessages = useMemo(() => {
    if (!threadUnreadOnly) {
      return messages;
    }

    return messages.filter((message) => message.read !== true);
  }, [messages, threadUnreadOnly]);

  const activePeerDisplayName = useMemo(() => {
    const peerId = activePeerId.trim();
    if (!peerId) {
      return "Contact";
    }

    const conversationMatch = conversations.find((conversation) => conversation.otherUserId === peerId);
    if (conversationMatch?.otherUserName) {
      return conversationMatch.otherUserName;
    }

    const contactMatch = contacts.find((contact) => contact.id === peerId);
    if (contactMatch?.name) {
      return contactMatch.name;
    }

    return typingPeerNames[peerId] ?? "Contact";
  }, [activePeerId, contacts, conversations, typingPeerNames]);

  const isActivePeerTyping = useMemo(() => {
    const peerId = activePeerId.trim();
    if (!peerId) {
      return false;
    }

    return typingPeerIds.includes(peerId);
  }, [activePeerId, typingPeerIds]);

  const threadRenderItems = useMemo<ThreadRenderItem[]>(() => {
    if (visibleMessages.length === 0) {
      return [];
    }

    const firstUnreadIncomingIndex = visibleMessages.findIndex(
      (message) => message.senderId !== currentUserId && !message.read
    );

    let lastDayKey = "";
    const items: ThreadRenderItem[] = [];

    for (let index = 0; index < visibleMessages.length; index += 1) {
      const message = visibleMessages[index];
      if (!message) {
        continue;
      }
      const date = new Date(message.createdAt);
      const dayKey = date.toISOString().slice(0, 10);

      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        items.push({
          type: "day",
          key: `day-${dayKey}`,
          label: date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        });
      }

      if (index === firstUnreadIncomingIndex) {
        items.push({
          type: "unread",
          key: `unread-${message.id}`,
        });
      }

      items.push({
        type: "message",
        key: `message-${message.id}`,
        message,
      });
    }

    return items;
  }, [currentUserId, visibleMessages]);

  const sendMessage = async () => {
    const recipientId = activePeerId.trim();
    const content = messageText.trim();
    if (!recipientId || !content) return;

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      senderId: currentUserId || "self",
      recipientId,
      content,
      read: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      localStatus: "sending",
    };

    setSending(true);
    setError("");
    setMessageText("");
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await sendMessageRequest(recipientId, activePeerRole, content);

      await loadConversations({ append: false });
      await loadThread(recipientId, { append: false });
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticId ? { ...message, localStatus: "failed" } : message
        )
      );
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const retryFailedMessage = useCallback(
    async (failedMessage: Message) => {
      if (!activePeerId || failedMessage.localStatus !== "failed") {
        return;
      }

      setError("");
      setMessages((prev) =>
        prev.map((message) =>
          message.id === failedMessage.id ? { ...message, localStatus: "sending" } : message
        )
      );

      try {
        await sendMessageRequest(activePeerId, activePeerRole, failedMessage.content);
        await loadConversations({ append: false });
        await loadThread(activePeerId, { append: false });
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === failedMessage.id ? { ...message, localStatus: "failed" } : message
          )
        );
        setError("Retry failed");
      }
    },
    [activePeerId, activePeerRole, loadConversations, loadThread, sendMessageRequest]
  );

  useEffect(() => {
    const container = threadContainerRef.current;
    if (!container || loadingOlder) {
      return;
    }

    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, loadingOlder]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
          <p className="text-sm text-slate-600">Realtime role-to-role messaging.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refreshMessages()}>
          Refresh
        </Button>
      </div>

      {error ? <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-1">
          <h3 className="font-semibold text-slate-900 mb-3">Conversations</h3>
          <div className="mb-3 space-y-2">
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="Search conversations"
              value={conversationQuery}
              onChange={(event) => setConversationQuery(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showUnreadConversationsOnly}
                onChange={(event) => setShowUnreadConversationsOnly(event.target.checked)}
              />
              Unread only
            </label>
          </div>
          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : filteredConversations.length === 0 ? (
            <p className="text-sm text-slate-600">
              {sortedConversations.length === 0
                ? "No conversations yet."
                : "No conversations match your filters."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredConversations.map((conversation) => (
                <li key={conversation.otherUserId}>
                  <button
                    type="button"
                    className={`w-full text-left border rounded-md p-3 ${activePeerId === conversation.otherUserId ? "border-blue-300 bg-blue-50" : ""}`}
                    onClick={() => {
                      setActivePeerId(conversation.otherUserId);
                      setActivePeerRole(conversation.otherUserRole);
                    }}
                  >
                    <p className="font-medium text-slate-900">{conversation.otherUserName}</p>
                    <p className="text-xs text-slate-500">{conversation.otherUserRole}</p>
                    <p className="text-sm text-slate-600 truncate">{conversation.lastMessage}</p>
                    {conversation.unreadCount > 0 ? (
                      <span className="text-xs text-blue-700">
                        {conversation.unreadCount} unread
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMoreConversations ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => void loadMoreConversations()}
              disabled={loadingMoreConversations}
            >
              {loadingMoreConversations ? "Loading..." : "Load more conversations"}
            </Button>
          ) : null}

          <div className="mt-5 border-t pt-4">
            <h4 className="font-semibold text-slate-900 mb-2">Contacts</h4>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded border px-2 py-1 text-sm"
                placeholder="Search contacts"
                value={contactQuery}
                onChange={(event) => setContactQuery(event.target.value)}
              />
              <select
                value={contactRole}
                onChange={(event) =>
                  setContactRole(
                    event.target.value as "all" | "admin" | "employer" | "jobseeker"
                  )
                }
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="all">all</option>
                <option value="jobseeker">jobseeker</option>
                <option value="employer">employer</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded border px-2 py-2 text-sm hover:bg-slate-50"
                    onClick={() => {
                      setActivePeerId(contact.id);
                      setActivePeerRole(contact.role);
                    }}
                  >
                    <p className="font-medium text-slate-900">{contact.name}</p>
                    <p className="text-xs text-slate-600">
                      {contact.role}
                      {contact.email ? ` • ${contact.email}` : ""}
                    </p>
                  </button>
                </li>
              ))}
              {contacts.length === 0 ? (
                <li className="text-xs text-slate-500 py-1">No contacts found.</li>
              ) : null}
            </ul>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="Recipient ID"
              value={activePeerId}
              onChange={(event) => setActivePeerId(event.target.value)}
            />
            <select
              value={activePeerRole}
              onChange={(event) => setActivePeerRole(event.target.value as "admin" | "employer" | "jobseeker")}
              className="rounded border px-3 py-2"
            >
              <option value="jobseeker">jobseeker</option>
              <option value="employer">employer</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="Search this thread"
              value={threadQueryInput}
              onChange={(event) => setThreadQueryInput(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={threadUnreadOnly}
                onChange={(event) => setThreadUnreadOnly(event.target.checked)}
              />
              Unread only
            </label>
            {(threadQueryInput || threadUnreadOnly) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setThreadQueryInput("");
                  setThreadUnreadOnly(false);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          <div
            ref={threadContainerRef}
            className="border rounded-md p-3 h-80 overflow-y-auto space-y-2 bg-white"
            onScroll={(event) => {
              const element = event.currentTarget;
              const distanceFromBottom = element.scrollHeight - (element.scrollTop + element.clientHeight);
              shouldAutoScrollRef.current = distanceFromBottom < 48;
            }}
          >
            {isActivePeerTyping ? (
              <p className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{activePeerDisplayName} is typing...</p>
            ) : null}
            {activePeerId && hasOlderMessages ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void loadOlderMessages()}
                disabled={loadingOlder}
                className="w-full"
              >
                {loadingOlder ? "Loading..." : "Load older messages"}
              </Button>
            ) : null}
            {threadRenderItems.length === 0 ? (
              <p className="text-sm text-slate-600">
                {messages.length === 0 ? "No messages in this thread." : "No messages match the current filters."}
              </p>
            ) : (
              threadRenderItems.map((item) => {
                if (item.type === "day") {
                  return (
                    <div key={item.key} className="sticky top-0 z-10 py-1 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                if (item.type === "unread") {
                  return (
                    <div key={item.key} className="flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-blue-200" />
                      <span className="text-xs font-medium text-blue-700">New messages</span>
                      <div className="h-px flex-1 bg-blue-200" />
                    </div>
                  );
                }

                const message = item.message;
                return (
                  <div key={item.key} className="border rounded-md p-2">
                    <p className="text-xs text-slate-500">
                      {message.senderId} • {formatDate(message.createdAt)}
                    </p>
                    <p className="text-sm text-slate-800 mt-1">{message.content}</p>
                    {message.senderId === currentUserId ? (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-slate-500">
                          {message.localStatus === "sending"
                            ? "Sending..."
                            : message.localStatus === "failed"
                              ? "Failed"
                              : message.read
                                ? message.readAt
                                  ? `Read ${formatDate(message.readAt)}`
                                  : "Read"
                                : "Sent"}
                        </p>
                        {message.localStatus === "failed" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => void retryFailedMessage(message)}
                          >
                            Retry
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="Type a message"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <Button onClick={() => void sendMessage()} disabled={sending || !activePeerId.trim()}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
