"use client";

import Link from "next/link";
import { MobileDrawer } from "@/components/ui/mobile-drawer";
import { JobseekerSidebar } from "@/components/jobseeker-sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type MobileHeaderProps = {
  user: {
    name: string | null;
    email: string | null;
    image?: string | null;
  };
};

export function MobileHeader({ user }: MobileHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MobileDrawer
            trigger={
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-600">
                <Menu className="h-6 w-6" />
              </Button>
            }
          >
            <JobseekerSidebar user={user} />
          </MobileDrawer>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-slate-900 flex items-center justify-center">
              <span className="text-white font-bold text-xs">G</span>
            </div>
            <p className="text-sm font-bold text-slate-900">GensanWorks</p>
          </div>
        </div>
        
        <Link
          href="/jobseeker/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
