"use client";

import { Home, Briefcase, ClipboardList, Bell, MessageCircle, User, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/jobseeker/dashboard", icon: Home },
  { title: "Find Jobs", url: "/jobseeker/jobs", icon: Briefcase },
  { title: "Applications", url: "/jobseeker/applications", icon: ClipboardList },
  { title: "Notifications", url: "/jobseeker/notifications", icon: Bell },
  { title: "Messages", url: "/jobseeker/messages", icon: MessageCircle },
  { title: "My Account", url: "/jobseeker/profile", icon: User },
  { title: "Settings", url: "/jobseeker/settings", icon: Settings },
];

export function JobseekerSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login?role=jobseeker" });
  };

  return (
    <aside className={`flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
      {/* Logo/Brand */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className={`font-bold text-slate-900 ${collapsed ? "hidden" : ""}`}>
            JobSeeker
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-slate-100"
          >
            <Briefcase className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navigationItems.map((item) => {
          const currentPath = pathname ?? "";
          const isActive = currentPath === item.url || currentPath.startsWith(item.url + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Panel */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session?.user?.image || ""} />
            <AvatarFallback>
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {session?.user?.name || "Jobseeker"}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          )}
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className={`w-full justify-start ${collapsed ? "px-2" : ""}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
