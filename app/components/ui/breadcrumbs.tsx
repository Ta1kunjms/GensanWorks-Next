"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname?.split("/").filter(Boolean) || [];
  const isJobDetailRoute = /^\/jobseeker\/jobs\/[^/]+$/.test(pathname ?? "");
  const isAdminApplicantDetail = /^\/admin\/applicants\/[^/]+$/.test(pathname ?? "");
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState<string | null>(null);

  useEffect(() => {
    if (!isJobDetailRoute || !pathname) {
      setJobTitle(null);
      return;
    }

    const jobId = pathname.split("/").filter(Boolean).pop();
    if (!jobId) {
      setJobTitle(null);
      return;
    }

    const controller = new AbortController();

    const loadJobTitle = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { positionTitle?: string };
        if (typeof data.positionTitle === "string" && data.positionTitle.trim().length > 0) {
          setJobTitle(data.positionTitle.trim());
        }
      } catch {
        if (!controller.signal.aborted) {
          setJobTitle(null);
        }
      }
    };

    void loadJobTitle();

    return () => controller.abort();
  }, [isJobDetailRoute, pathname]);

  useEffect(() => {
    if (!isAdminApplicantDetail || !pathname) {
      setApplicantName(null);
      return;
    }

    const applicantId = pathname.split("/").filter(Boolean).pop();
    if (!applicantId) {
      setApplicantName(null);
      return;
    }

    const controller = new AbortController();

    const loadApplicantName = async () => {
      try {
        const response = await fetch(`/api/admin/applicants/${applicantId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = await response.json();
        const p = data.profile;
        if (p) {
          const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
          setApplicantName(name || "Job Seeker");
        }
      } catch {
        if (!controller.signal.aborted) setApplicantName(null);
      }
    };

    void loadApplicantName();

    return () => controller.abort();
  }, [isAdminApplicantDetail, pathname]);

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
        let label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
        
        if (isLast) {
          if (isJobDetailRoute) label = jobTitle ?? "Job Details";
          else if (isAdminApplicantDetail) label = applicantName ?? "Job Seeker";
        }

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
