"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  UserCircle2,
} from "lucide-react";

type EmployerShellProps = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    company: string | null;
  };
  children: React.ReactNode;
};

type BadgeState = {
  messagesUnread: number;
  notificationsUnread: number;
};

const navItems = [
  { label: "Dashboard", href: "/employer/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/employer/jobs", icon: Briefcase },
  { label: "Applications", href: "/employer/applications", icon: ClipboardList },
  { label: "Profile", href: "/employer/profile", icon: UserCircle2 },
  { label: "Messages", href: "/employer/messages", icon: MessageSquare, badgeKey: "messagesUnread" as const },
  { label: "Notifications", href: "/employer/notifications", icon: Bell, badgeKey: "notificationsUnread" as const },
  { label: "Settings", href: "/employer/settings", icon: Settings },
  { label: "Use Cases", href: "/employer/use-cases", icon: Sparkles },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmployerShell({ user, children }: EmployerShellProps) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<BadgeState>({ messagesUnread: 0, notificationsUnread: 0 });

  useEffect(() => {
    let mounted = true;

    const loadBadges = async () => {
      try {
        const [messagesRes, notificationsRes] = await Promise.all([
          fetch("/api/messages/unread", { cache: "no-store" }),
          fetch("/api/notifications?limit=1", { cache: "no-store" }),
        ]);

        if (!mounted) return;

        if (messagesRes.ok) {
          const payload = (await messagesRes.json()) as { unreadCount?: number; count?: number };
          setBadges((prev) => ({
            ...prev,
            messagesUnread: payload.unreadCount ?? payload.count ?? 0,
          }));
        }

        if (notificationsRes.ok) {
          const payload = (await notificationsRes.json()) as { unreadCount?: number };
          setBadges((prev) => ({
            ...prev,
            notificationsUnread: payload.unreadCount ?? 0,
          }));
        }
      } catch {
        // Badge loading is best-effort.
      }
    };

    void loadBadges();
    const interval = window.setInterval(() => {
      void loadBadges();
    }, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const initials = useMemo(() => {
    const base = user.company || user.name || user.email || "Employer";
    return base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "E")
      .join("");
  }, [user.company, user.email, user.name]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-800 bg-slate-950 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 px-6 py-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">GensanWorks</div>
            <div className="mt-2 text-2xl font-semibold text-white">Employer Portal</div>
            <p className="mt-1 text-sm text-slate-400">Hiring workspace and applicant flow</p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const active = isActivePath(pathname ?? "", item.href);
              const badgeValue = item.badgeKey ? badges[item.badgeKey] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.24)]"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {badgeValue > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {badgeValue > 99 ? "99+" : badgeValue}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.company || user.name || "Employer"}</p>
                  <p className="truncate text-xs text-slate-400">{user.email || "Signed in"}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href="/employer/profile"
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:border-slate-500"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/login?role=employer" })}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 bg-slate-100">
          <div className="min-h-screen bg-white text-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] lg:rounded-tl-[2rem]">
            <div className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
              <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employer workspace</p>
                  <h1 className="text-xl font-semibold text-slate-950">Manage jobs, applications, messages, and settings</h1>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Live badges</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Protected routes</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Responsive shell</span>
                </div>
              </div>
            </div>

            <main className="mx-auto min-h-0 max-w-7xl px-4 py-6 md:px-6 lg:px-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}