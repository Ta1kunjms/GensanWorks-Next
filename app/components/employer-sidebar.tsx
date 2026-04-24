"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Sparkles,
  MessageSquare,
  Bell,
  UserCircle2,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EmployerSidebarProps = {
  user?: {
    name: string | null;
    email: string | null;
    image?: string | null;
    company?: string | null;
  };
};

type NavItem = {
  label: string;
  href: string;
  icon: any;
};

const primaryItems: NavItem[] = [
  { label: "Dashboard", href: "/employer/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/employer/jobs", icon: Briefcase },
  { label: "Applications", href: "/employer/applications", icon: ClipboardList },
  { label: "Use Cases", href: "/employer/use-cases", icon: Sparkles },
  { label: "Messages", href: "/employer/messages", icon: MessageSquare },
  { label: "Notifications", href: "/employer/notifications", icon: Bell },
];

const bottomItems: NavItem[] = [
  { label: "Profile", href: "/employer/profile", icon: UserCircle2 },
  { label: "Settings", href: "/employer/settings", icon: Settings },
  { label: "Logout", href: "/logout", icon: LogOut },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/employer/dashboard" && pathname === "/employer") {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatInitials(name: string | null, email: string | null, company: string | null) {
  const base = company?.trim() || name?.trim() || email?.trim() || "Employer";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "E")
    .join("");
}

export function EmployerSidebar({ user }: EmployerSidebarProps) {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const [msgRes, notifRes] = await Promise.all([
          fetch("/api/messages/unread", { cache: "no-store" }),
          fetch("/api/notifications?limit=1", { cache: "no-store" }),
        ]);
        
        if (!mounted) return;

        if (msgRes.ok) {
          const d = await msgRes.json();
          setUnreadCounts(prev => ({ ...prev, messages: d.unreadCount ?? d.count ?? 0 }));
        }
        if (notifRes.ok) {
          const d = await notifRes.json();
          setUnreadCounts(prev => ({ ...prev, notifications: d.unreadCount ?? 0 }));
        }
      } catch (err) {}
    };

    void loadUnread();

    const interval = window.setInterval(() => {
      void loadUnread();
    }, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const initials = useMemo(
    () => formatInitials(user?.name ?? null, user?.email ?? null, user?.company ?? null),
    [user?.email, user?.name, user?.company],
  );

  const renderSidebarItem = (item: NavItem) => {
    const active = isActivePath(pathname ?? "", item.href);
    let badge = 0;
    if (item.label === "Messages") badge = unreadCounts.messages;
    if (item.label === "Notifications") badge = unreadCounts.notifications;

    if (item.label === "Logout") {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-slate-300 hover:text-white"
        >
          <div className="h-6 w-6 rounded-sm flex items-center justify-center flex-shrink-0 transition-all bg-white/70">
            <item.icon className="h-4 w-4 flex-none text-slate-900" />
          </div>
          <span className="flex-1 text-left">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
          active ? "text-white bg-white/10" : "text-slate-300 hover:text-white hover:bg-white/5"
        }`}
      >
        <div
          className={`h-6 w-6 rounded-sm flex items-center justify-center flex-shrink-0 transition-all ${
            active ? "bg-white" : "bg-white/70 group-hover:bg-white"
          }`}
        >
          <item.icon className="h-4 w-4 flex-none text-slate-900" />
        </div>
        <span className="flex-1">{item.label}</span>
        {badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-full max-w-[18rem] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl">
      <div className="border-b border-slate-800 px-5 py-6">
        <div className="flex items-start gap-3">
          <Image
            src="/peso-gsc-logo.png"
            alt="PESO GSC"
            width={48}
            height={48}
            className="rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold">
              <span className="text-[#2563eb]">Gensan</span>
              <span className="text-[#ef4444]">Works</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Official Job Assistance
              <br />
              Platform of PESO - General Santos City
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {primaryItems.map((item) => renderSidebarItem(item))}
        </div>
      </div>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="space-y-1">
          {bottomItems.map((item) => renderSidebarItem(item))}
        </div>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-slate-300">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={user?.image ?? undefined}
              alt={user?.company || user?.name || "Employer"}
            />
            <AvatarFallback className="rounded-full bg-white/20 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white">
              {user?.company || user?.name || "Employer"}
            </p>
            <p className="truncate text-xs text-slate-500">Employer Portal</p>
          </div>
        </div>
      </div>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You&apos;ll need to log in again
              to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLogoutConfirm(false);
                void signOut({ callbackUrl: "/login?role=employer" });
              }}
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
