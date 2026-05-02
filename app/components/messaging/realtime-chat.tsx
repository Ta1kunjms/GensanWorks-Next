"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, Paperclip, Circle, CheckCheck, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Message = {
  id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  attachment_urls: string[];
  read_at: string | null;
  created_at: string;
};

type Thread = {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  jobTitle?: string;
  applicationStatus?: "under_review" | "interview" | "hired" | "rejected" | null;
};

interface RealtimeChatProps {
  currentUserId: string;
  currentUserRole: "jobseeker" | "employer" | "admin";
  /** Optional: status action buttons shown in-thread (employer side) */
  onStatusChange?: (peerId: string, status: "under_review" | "interview" | "hired" | "rejected") => Promise<void>;
  showStatusActions?: boolean;
}

export function RealtimeChat({ currentUserId, currentUserRole, onStatusChange, showStatusActions = false }: RealtimeChatProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const [statusChanging, setStatusChanging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Scroll to bottom ────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // ── Load thread list ─────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      setLoadingThreads(true);
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json() as { conversations?: Thread[] };
        setThreads(data.conversations ?? []);
      }
      setLoadingThreads(false);
    })();
  }, []);

  // ── Subscribe to new messages (Realtime) ─────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`messages:user:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // If the message is in the active thread, append it
          if (activeThread && newMsg.sender_id === activeThread.otherUserId) {
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
            // Mark as read
            void fetch(`/api/messages/${newMsg.id}/read`, { method: "PATCH" });
          }
          // Update thread list unread count
          setThreads((prev) =>
            prev.map((t) =>
              t.otherUserId === newMsg.sender_id
                ? { ...t, lastMessage: newMsg.content, lastMessageAt: newMsg.created_at, unreadCount: activeThread?.otherUserId === newMsg.sender_id ? 0 : t.unreadCount + 1 }
                : t
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [currentUserId, activeThread, scrollToBottom]);

  // ── Presence tracking ───────────────────────────────────────────
  useEffect(() => {
    if (!activeThread) return;

    const presenceChannel = supabase.channel(`presence:${activeThread.otherUserId}`, {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setPeerOnline(Object.keys(state).includes(activeThread.otherUserId));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = presenceChannel;
    return () => { void supabase.removeChannel(presenceChannel); };
  }, [activeThread, currentUserId]);

  // ── Load messages for active thread ─────────────────────────────
  const loadMessages = useCallback(async (thread: Thread) => {
    setActiveThread(thread);
    setLoadingMessages(true);
    setMessages([]);
    const res = await fetch(`/api/messages?peerId=${thread.otherUserId}`);
    if (res.ok) {
      const data = await res.json() as { messages?: Message[] };
      setMessages(data.messages ?? []);
      scrollToBottom();
    }
    setLoadingMessages(false);
    // Mark thread as read locally
    setThreads((prev) => prev.map((t) => t.otherUserId === thread.otherUserId ? { ...t, unreadCount: 0 } : t));
    // Mark messages as read in DB
    void fetch(`/api/messages/conversation/${thread.otherUserId}`, { method: "PATCH" });
  }, [scrollToBottom]);

  // ── Send message ─────────────────────────────────────────────────
  const sendMessage = async () => {
    if ((!body.trim() && pendingAttachments.length === 0) || !activeThread || sending) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: activeThread.otherUserId,
        recipientRole: activeThread.otherUserRole,
        content: body.trim() || "📎 Attachment",
      }),
    });
    if (res.ok) {
      const data = await res.json() as { data?: Message };
      if (data.data) {
        setMessages((prev) => [...prev, { ...data.data!, attachment_urls: pendingAttachments, read_at: null }]);
        scrollToBottom();
      }
    }
    setBody("");
    setPendingAttachments([]);
    setSending(false);
  };

  // ── Upload attachment ─────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload/resume", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json() as { url?: string };
      if (data.url) setPendingAttachments((prev) => [...prev, data.url!]);
    }
    setUploadingFile(false);
  };

  const handleStatusAction = async (status: "under_review" | "interview" | "hired" | "rejected") => {
    if (!onStatusChange || !activeThread) return;
    setStatusChanging(true);
    await onStatusChange(activeThread.otherUserId, status);
    setStatusChanging(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* ── Thread List ──────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">Messages</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="p-3 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Your messages will appear here</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.otherUserId}
                  onClick={() => void loadMessages(thread)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                    activeThread?.otherUserId === thread.otherUserId
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {thread.otherUserName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    {peerOnline && activeThread?.otherUserId === thread.otherUserId && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm text-slate-900 truncate">{thread.otherUserName}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(thread.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-slate-500 truncate">{thread.lastMessage}</p>
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-[10px] h-4 px-1.5 flex-shrink-0">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Area ───────────────────────────────────────────── */}
      {activeThread ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {activeThread.otherUserName?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{activeThread.otherUserName}</p>
                <div className="flex items-center gap-1.5">
                  <Circle className={`w-2 h-2 fill-current ${peerOnline ? "text-emerald-500" : "text-slate-300"}`} />
                  <span className="text-[11px] text-slate-500">{peerOnline ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>
            {/* Status action buttons (employer only) */}
            {showStatusActions && onStatusChange && (
              <div className="flex items-center gap-2">
                {statusChanging && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                {(["under_review", "interview", "hired", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => void handleStatusAction(s)}
                    disabled={statusChanging}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50 ${
                      s === "hired" ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                      s === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" :
                      s === "interview" ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" :
                      "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {s === "under_review" ? "Under Review" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {loadingMessages ? (
              <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <Skeleton className="h-10 w-48 rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-slate-500">No messages yet. Say hello! 👋</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                        }`}
                      >
                        {msg.content}
                        {/* Attachments */}
                        {msg.attachment_urls?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachment_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer"
                                className={`flex items-center gap-1.5 text-xs underline ${isMine ? "text-blue-100" : "text-blue-600"}`}>
                                <FileText className="w-3 h-3" />
                                Attachment {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          <CheckCheck className={`w-3 h-3 ${msg.read_at ? "text-blue-500" : "text-slate-300"}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 bg-white space-y-2">
            {activeThread.applicationStatus === "hired" || activeThread.applicationStatus === "rejected" ? (
              <div className="flex items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium gap-2">
                <CheckCheck className="w-4 h-4" />
                This conversation is read-only because the application status is {activeThread.applicationStatus}.
              </div>
            ) : (
              <>
                {/* Pending attachments */}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((url, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs text-blue-700">
                        <FileText className="w-3 h-3" />
                        File {i + 1}
                        <button onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {/* File upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-50"
                  >
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); }} />
                  {/* Text input */}
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                    placeholder="Type a message... (Enter to send)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all max-h-28 overflow-y-auto"
                  />
                  <Button
                    onClick={() => void sendMessage()}
                    disabled={sending || (!body.trim() && pendingAttachments.length === 0)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 h-auto"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
            <Send className="w-7 h-7 text-blue-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Select a conversation</h3>
          <p className="text-sm text-slate-500 mt-1">Choose a thread from the left to start chatting</p>
        </div>
      )}
    </div>
  );
}
