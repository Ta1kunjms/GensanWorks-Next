"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string | null;
  role: string | null;
  relatedId: string | null;
  relatedType: string | null;
  read: boolean | null;
  readAt: string | null;
  createdAt: string;
};

type StreamPayload = {
  unreadCount: number;
  latestId: string | null;
  timestamp: string;
};

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
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
  };

  useEffect(() => {
    void load();

    const source = new EventSource("/api/notifications/stream");
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
      // Allow native EventSource auto-reconnect.
      void load();
    };

    return () => {
      source.close();
    };
  }, []);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "All caught up";
    return `${unreadCount} unread`;
  }, [unreadCount]);

  const markOneAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) return;
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
        <Button variant="outline" onClick={markAllAsRead} disabled={loading || unreadCount === 0}>
          Mark all as read
        </Button>
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
                    <p className="text-xs text-slate-500 mt-2">{formatDate(notification.createdAt)}</p>
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
    </div>
  );
}
