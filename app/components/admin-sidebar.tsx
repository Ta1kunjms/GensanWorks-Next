"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Briefcase,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  Wand2,
  Settings,
  ClipboardList,
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

type AdminSidebarProps = {
  user: {
    name: string | null;
    email: string | null;
    image?: string | null;
  };
};

type BadgeCounts = {
  messages: number;
  notifications: number;
  pendingAccessRequests: number;
  pendingEmployers: number;
  pendingJobs: number;
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: keyof BadgeCounts;
};

const primaryItems: NavItem[] = [
  { label: "Home", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Job Seekers", href: "/admin/applicants", icon: Users },
  { label: "Employers", href: "/admin/employers", icon: Briefcase },
  { label: "Jobs", href: "/admin/jobs", icon: FileText },
  { label: "Referrals", href: "/admin/referrals", icon: ClipboardList },
  { label: "Matching", href: "/admin/matching", icon: Wand2 },
  { label: "Analytics", href: "/admin/reports", icon: Activity },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList },
];

const bottomItems: NavItem[] = [
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Logout", href: "/admin/logout", icon: LogOut },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin/dashboard" && pathname === "/admin") {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function renderItem(item: NavItem, pathname: string, onLogoutClick?: () => void) {
  const active = isActivePath(pathname ?? "", item.href);

  if (item.label === "Logout") {
    return (
      <button
        key={item.href}
        type="button"
        onClick={onLogoutClick}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-slate-300 hover:text-white"
      >
        <div className="h-6 w-6 rounded-sm flex items-center justify-center flex-shrink-0 transition-all bg-white/70">
          <item.icon className="h-4 w-4 flex-none text-slate-900" />
        </div>
        <span className="flex-1">{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      key={item.href}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
        active ? "text-white" : "text-slate-300 hover:text-white"
      }`}
    >
      <div
        className={`h-6 w-6 rounded-sm flex items-center justify-center flex-shrink-0 transition-all ${
          active ? "bg-white" : "bg-white/70 hover:bg-white"
        }`}
      >
        <item.icon
          className={`h-4 w-4 flex-none ${
            active ? "text-slate-900" : "text-slate-900"
          }`}
        />
      </div>
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

function formatInitials(name: string | null, email: string | null) {
  const base = name?.trim() || email?.trim() || "Admin";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "A")
    .join("");
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const initials = useMemo(
    () => formatInitials(user.name, user.email),
    [user.email, user.name],
  );

  return (
    <aside className="flex h-full w-64 flex-col rounded-xl bg-slate-900 mr-5">
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
              <span className="text-[#ef4444]">Gensan</span>
              <span className="text-[#2563eb]">Works</span>
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
          {primaryItems.map((item) => renderItem(item, pathname ?? ""))}
        </div>
      </div>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="space-y-1">
          {bottomItems.map((item) =>
            renderItem(item, pathname ?? "", () => setShowLogoutConfirm(true))
          )}
        </div>
      </div>

      <div className="border-t border-slate-800 p-4">
        <Link
          href="/admin/profile"
          className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white group"
        >
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name || "Admin"}
            />
            <AvatarFallback className="rounded-full bg-white/20 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white">
              {user.name || "Demo Admin"}
            </p>
            <p className="truncate text-xs text-slate-500">#0I192025</p>
          </div>
          <svg
            className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </Link>
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
              onClick={async () => {
                setShowLogoutConfirm(false);
                try {
                  await signOut();
                  router.push("/login/admin");
                  router.refresh();
                } catch (error) {
                  console.error("Logout failed:", error);
                }
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
