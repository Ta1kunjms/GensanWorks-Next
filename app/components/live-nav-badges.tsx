"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LiveNavBadgesProps = {
  messagesHref: string;
  notificationsHref: string;
};

export function LiveNavBadges({ messagesHref, notificationsHref }: LiveNavBadgesProps) {
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const loadUnread = async () => {
    try {
      const [messagesRes, notificationsRes] = await Promise.all([
        fetch("/api/messages/unread", { cache: "no-store" }),
        fetch("/api/notifications?limit=1", { cache: "no-store" }),
      ]);

      if (messagesRes.ok) {
        const messages = (await messagesRes.json()) as { unreadCount: number };
        setMessagesUnread(messages.unreadCount ?? 0);
      }

      if (notificationsRes.ok) {
        const notifications = (await notificationsRes.json()) as { unreadCount: number };
        setNotificationsUnread(notifications.unreadCount ?? 0);
      }
    } catch {
      // ignore polling errors
    }
  };

  useEffect(() => {
    void loadUnread();

    const notificationsStream = new EventSource("/api/notifications/stream");
    notificationsStream.addEventListener("notification", () => {
      void loadUnread();
    });
    notificationsStream.onerror = () => {
      void loadUnread();
    };

    const messagesStream = new EventSource("/api/messages/stream");
    messagesStream.addEventListener("message", () => {
      void loadUnread();
    });
    messagesStream.onerror = () => {
      void loadUnread();
    };

    return () => {
      notificationsStream.close();
      messagesStream.close();
    };
  }, []);

  return (
    <>
      <Link href={messagesHref} className="text-slate-700 hover:text-slate-900">
        Messages
        {messagesUnread > 0 ? ` (${messagesUnread})` : ""}
      </Link>
      <Link href={notificationsHref} className="text-slate-700 hover:text-slate-900">
        Notifications
        {notificationsUnread > 0 ? ` (${notificationsUnread})` : ""}
      </Link>
    </>
  );
}
