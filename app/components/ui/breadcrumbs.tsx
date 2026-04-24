"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname?.split("/").filter(Boolean) || [];

  return (
    <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-6">
      <Link
        href="/"
        className="flex items-center hover:text-slate-900 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");

        return (
          <div key={href} className="flex items-center space-x-2">
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            {isLast ? (
              <span className="text-slate-900 font-semibold">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-900 transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
