"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { QrCode, Download, X } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string | null;
  role: string | null;
  related_id: string | null;
  related_type: string | null;
  read: boolean | null;
  read_at: string | null;
  created_at: string;
};

type StreamPayload = {
  unreadCount: number;
  latestId: string | null;
  timestamp: string;
};

type SocketSessionResponse = {
  token?: string;
  role?: "admin" | "employer" | "jobseeker";
  userId?: string;
  expiresInSeconds?: number;
};

type NotificationRealtimePayload = {
  notificationId?: string | null;
  unreadCount?: number;
  timestamp?: string;
};

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);
  const [slipDetails, setSlipDetails] = useState<{ qrCodeUrl: string; slipNumber: string; jobTitle: string; employerName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!response.ok) {
        setError("Unable to load notifications");
        return;
      }

      const data = (await response.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setError("Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;
    let socket: Socket | null = null;
    let disposed = false;

    const attachSseFallback = () => {
      if (source || disposed) {
        return;
      }

      source = new EventSource("/api/notifications/stream");
      source.addEventListener("notification", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as StreamPayload;
          setUnreadCount(payload.unreadCount ?? 0);
          void load();
        } catch {
          // ignore parse errors
        }
      });

      source.onerror = () => {
        void load();
      };
    };

    const init = async () => {
      await load();

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

        socket.on("notification:update", (payload: NotificationRealtimePayload) => {
          if (typeof payload.unreadCount === "number") {
            setUnreadCount(payload.unreadCount);
          }

          void load();
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
  }, [load]);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "All caught up";
    return `${unreadCount} unread`;
  }, [unreadCount]);

  const refresh = async () => {
    await load();
  };

  const markOneAsRead = async (id: string) => {
    try {
      const primaryResponse = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });

      if (!primaryResponse.ok) {
        const fallbackResponse = await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
        });

        if (!fallbackResponse.ok) {
          return;
        }
      }

      await load();
    } catch {
      // no-op
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
      if (!response.ok) return;
      await load();
    } catch {
      // no-op
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-600">{unreadLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={loading || unreadCount === 0}>
            Mark all as read
          </Button>
        </div>
      </div>

      {error ? <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card> : null}

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-slate-600">No notifications yet.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`border rounded-md p-4 ${notification.read ? "bg-white" : "bg-blue-50 border-blue-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{notification.title}</p>
                    <p className="text-sm text-slate-700 mt-1">{notification.message}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatDate(notification.created_at)}</p>
                    
                    {notification.related_id && notification.related_type && (
                      <div className="mt-3 flex gap-2">
                        {notification.related_type === "referral_slip" ? (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="text-[10px] font-bold uppercase tracking-wider h-8 gap-1.5"
                            onClick={() => {
                              setLoadingSlip(true);
                              setSelectedSlipId(notification.related_id);
                              fetch(`/api/jobseeker/referrals/${notification.related_id}`)
                                .then((res) => res.json())
                                .then((data) => {
                                  if (data.slip) {
                                    setSlipDetails(data.slip);
                                  }
                                })
                                .catch((err) => console.error("Failed to load slip details:", err))
                                .finally(() => setLoadingSlip(false));
                            }}
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            View QR Code
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="text-[10px] font-bold uppercase tracking-wider h-8"
                            onClick={() => {
                              let url = "";
                              if (notification.role === "employer") {
                                if (notification.related_type === "job") {
                                  url = `/employer/applications?tab=shortlisted&jobId=${notification.related_id}`;
                                } else if (notification.related_type === "application") {
                                  url = "/employer/applications";
                                } else if (notification.related_type === "referral") {
                                  url = "/employer/applications?tab=referrals";
                                }
                              } else if (notification.role === "jobseeker") {
                                if (notification.related_type === "application") {
                                  url = `/jobseeker/applications/${notification.related_id}`;
                                } else if (notification.related_type === "referral") {
                                  url = "/jobseeker/applications?tab=referred";
                                }
                              }
                              
                              if (url) {
                                window.location.href = url;
                              }
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {!notification.read ? (
                    <Button size="sm" variant="outline" onClick={() => markOneAsRead(notification.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Referral Slip QR Code Modal */}
      {(selectedSlipId || loadingSlip || slipDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-indigo-600 animate-pulse" />
                Referral QR Code
              </h3>
              <button 
                onClick={() => {
                  setSelectedSlipId(null);
                  setSlipDetails(null);
                }} 
                className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center">
              {loadingSlip ? (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : slipDetails ? (
                <>
                  <div className="w-48 h-48 bg-white border-4 border-indigo-50/50 rounded-2xl p-2 shadow-lg mb-6 hover:scale-105 transition-transform duration-300">
                    {slipDetails.qrCodeUrl ? (
                      <img 
                        src={slipDetails.qrCodeUrl} 
                        alt="Referral QR Code" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                        <QrCode className="h-12 w-12" />
                        <span className="text-[10px] mt-2">No QR Code URL</span>
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-bold text-indigo-900 tracking-wide">{slipDetails.slipNumber}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{slipDetails.jobTitle}</p>
                  <p className="text-xs text-slate-500">{slipDetails.employerName}</p>
                  <p className="text-[11px] text-slate-400 mt-5 max-w-[240px] leading-relaxed">
                    Show this QR code to the employer HR during your visit or interview.
                  </p>
                </>
              ) : (
                <p className="text-sm text-red-600">Failed to load referral slip details.</p>
              )}
            </div>

            {slipDetails && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 text-slate-700 border-slate-200 hover:bg-slate-100" 
                  onClick={() => {
                    window.open(`/referral/${slipDetails.slipNumber}`, "_blank");
                  }}
                >
                  Verification
                </Button>
                {slipDetails.qrCodeUrl && (
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1.5"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = slipDetails.qrCodeUrl;
                      link.download = `Referral_${slipDetails.slipNumber}.png`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Save
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
