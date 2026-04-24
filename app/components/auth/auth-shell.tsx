"use client";

import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type RoleId = "jobseeker" | "employer" | "admin";

type AuthShellProps = {
  title: string;
  subtitle: string;
  roleLabel: string;
  roleId: RoleId;
  sideTitle: string;
  sideBullets: string[];
  primaryPortalBaseHref?: "/login" | "/signup";
  showPrimaryPortals?: boolean;
  showAdminPortalButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const primaryPortals: { id: "jobseeker" | "employer"; label: string; href: string }[] = [
  { id: "jobseeker", label: "Jobseeker", href: "/login?role=jobseeker" },
  { id: "employer", label: "Employer", href: "/login?role=employer" },
];

const adminPortal = { id: "admin" as const, label: "Admin Portal", href: "/login/admin" };

const roleThemes: Record<
  RoleId,
  {
    ambient: string;
    ring: string;
    badgeText: string;
    dot: string;
    panelAccent: string;
    portalBorder: string;
    portalActive: string;
    portalPassive: string;
    portalInactiveBorder: string;
    titleDot: string;
  }
> = {
  jobseeker: {
    ambient:
      "bg-[radial-gradient(circle_at_10%_12%,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.14),transparent_34%),radial-gradient(circle_at_55%_95%,rgba(14,165,233,0.08),transparent_42%)]",
    ring: "border-sky-100",
    badgeText: "text-sky-700/90",
    dot: "bg-blue-500",
    panelAccent: "from-blue-700 to-sky-600",
    portalBorder: "border-sky-200",
    portalActive: "bg-slate-900 text-white shadow-md shadow-slate-300/50",
    portalPassive: "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800",
    portalInactiveBorder: "border-sky-300",
    titleDot: "text-blue-500",
  },
  employer: {
    ambient:
      "bg-[radial-gradient(circle_at_12%_14%,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(251,146,60,0.16),transparent_34%),radial-gradient(circle_at_55%_95%,rgba(250,204,21,0.10),transparent_42%)]",
    ring: "border-amber-100",
    badgeText: "text-amber-700/90",
    dot: "bg-amber-500",
    panelAccent: "from-amber-600 to-orange-500",
    portalBorder: "border-amber-200",
    portalActive: "bg-slate-900 text-white shadow-md shadow-slate-300/50",
    portalPassive: "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800",
    portalInactiveBorder: "border-sky-300",
    titleDot: "text-amber-500",
  },
  admin: {
    ambient:
      "bg-[radial-gradient(circle_at_12%_14%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(20,184,166,0.16),transparent_34%),radial-gradient(circle_at_55%_95%,rgba(45,212,191,0.09),transparent_42%)]",
    ring: "border-emerald-100",
    badgeText: "text-emerald-700/90",
    dot: "bg-emerald-500",
    panelAccent: "from-emerald-600 to-teal-500",
    portalBorder: "border-emerald-200",
    portalActive: "bg-slate-900 text-white shadow-md shadow-slate-300/50",
    portalPassive: "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800",
    portalInactiveBorder: "border-sky-300",
    titleDot: "text-emerald-500",
  },
};

function roleIcon(roleId: RoleId) {
  if (roleId === "employer") return <Building2 className="h-4 w-4" />;
  if (roleId === "admin") return <ShieldCheck className="h-4 w-4" />;
  return <BriefcaseBusiness className="h-4 w-4" />;
}

function getPrimaryActiveIndex(roleId: RoleId) {
  if (roleId === "employer") return 1;
  return 0;
}

export function AuthShell({
  title,
  subtitle,
  roleLabel,
  roleId,
  sideTitle,
  sideBullets,
  primaryPortalBaseHref = "/login",
  showPrimaryPortals = true,
  showAdminPortalButton = roleId === "admin",
  children,
  footer,
}: AuthShellProps) {
  const theme = roleThemes[roleId];
  const primaryActiveIndex = getPrimaryActiveIndex(roleId);
  const isAdminActive = roleId === "admin";
  const showAdminButton = showAdminPortalButton;

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <div className="relative overflow-hidden">
        <div className={cn("pointer-events-none absolute inset-0", theme.ambient)} />

        <header className="relative border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className={cn("inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm", theme.portalBorder)}>
                <Image
                  src="/peso-gsc-logo.png"
                  alt="PESO General Santos logo"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-cover"
                  priority
                />
              </span>
              <span className="leading-tight">
                <span className="block text-xl font-extrabold tracking-tight text-slate-900">GensanWorks</span>
                <span className="block text-xs font-medium text-slate-500">Public Employment Service Office</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
              <Link href="/" className="transition-colors hover:text-slate-900">Home</Link>
              <Link href="/jobseeker/jobs" className="transition-colors hover:text-slate-900">Services</Link>
              <Link href="/" className="transition-colors hover:text-slate-900">How It Works</Link>
              <Link href="/about" className="transition-colors hover:text-slate-900">About</Link>
              <Link href="/contact" className="transition-colors hover:text-slate-900">Contact</Link>
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              {showPrimaryPortals ? (
                <div className={cn("relative grid grid-cols-2 rounded-2xl border bg-white p-1 shadow-sm", theme.portalBorder)}>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl transition-transform duration-300 ease-out",
                      theme.portalActive
                    )}
                    style={{ transform: `translateX(${primaryActiveIndex * 100}%)` }}
                  />
                  {primaryPortals.map((portal, index) => (
                    <Link
                      key={portal.id}
                      href={`${primaryPortalBaseHref}?role=${portal.id}`}
                      className={cn(
                        "relative z-10 rounded-xl px-5 py-2 text-sm font-semibold transition-colors",
                        index === primaryActiveIndex && roleId !== "admin"
                          ? "text-white"
                          : cn(theme.portalPassive, theme.portalInactiveBorder)
                      )}
                    >
                      {portal.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              {showAdminButton ? (
                <Link
                  href={adminPortal.href}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                    isAdminActive
                      ? theme.portalActive
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  )}
                >
                  {adminPortal.label}
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <main className="relative mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-7xl lg:grid-cols-2">
          <section className={cn("order-2 flex flex-col justify-between border-r border-slate-200/70 px-6 py-10 sm:px-10 lg:order-1 lg:py-14", theme.ring)}>
            <div className="max-w-xl">
              <p className={cn("inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]", theme.badgeText)}>
                {roleIcon(roleId)}
                {roleLabel}
              </p>

              <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-tight text-slate-900 sm:text-6xl">
                {title}
                <span className={theme.titleDot}>.</span>
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-slate-600">{subtitle}</p>

              <div className={cn("mt-8 rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur-sm", theme.ring)}>
                <p className="text-sm font-semibold text-slate-900">{sideTitle}</p>
                <ul className="mt-3 space-y-2 text-base text-slate-600">
                  {sideBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", theme.dot)} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-10 text-sm text-slate-500">Official Job Assistance Platform of PESO - General Santos City</p>
          </section>

          <section className="order-1 flex items-center px-6 py-10 sm:px-10 lg:order-2 lg:py-14">
            <div className="w-full max-w-xl lg:pl-10">
              {showPrimaryPortals || showAdminButton ? (
                <div className="mb-6 md:hidden">
                <p className="text-sm font-medium text-slate-500">Portal</p>
                <div className="mt-3 space-y-2">
                  {showPrimaryPortals ? (
                    <div className={cn("relative grid grid-cols-2 rounded-lg border bg-white p-1", theme.portalBorder)}>
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-md transition-transform duration-300 ease-out",
                          theme.portalActive
                        )}
                        style={{ transform: `translateX(${primaryActiveIndex * 100}%)` }}
                      />
                      {primaryPortals.map((portal, index) => (
                        <Link
                          key={portal.id}
                          href={`${primaryPortalBaseHref}?role=${portal.id}`}
                          className={cn(
                            "relative z-10 rounded-md px-3 py-1.5 text-center text-sm font-semibold transition-colors",
                            index === primaryActiveIndex && roleId !== "admin"
                              ? "text-white"
                              : "text-slate-600"
                          )}
                        >
                          {portal.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {showAdminButton ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={adminPortal.href}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                          isAdminActive
                            ? theme.portalActive
                            : "border-slate-300 bg-white text-slate-600"
                        )}
                      >
                        {adminPortal.label}
                      </Link>
                    </div>
                  ) : null}
                </div>
                </div>
              ) : null}

              {children}

              {footer ? <div className="mt-6 border-t border-slate-200 pt-5">{footer}</div> : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
