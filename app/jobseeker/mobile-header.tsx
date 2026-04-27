"use client";

import Link from "next/link";
import Image from "next/image";
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
          
          <div className="flex items-center gap-3">
            <Image 
              src="/peso-gsc-logo.png" 
              alt="GensanWorks" 
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight leading-none">
                <span className="text-red-600">Gensan</span>
                <span className="text-blue-600">Works</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Public Employment Service Office
              </span>
            </div>
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
