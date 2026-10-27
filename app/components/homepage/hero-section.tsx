"use client";

import React, { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Zap,
  MapPin,
  HeartHandshake,
  ChevronRight,
  Search,
  Users,
  Briefcase,
  Building2,
  Landmark,
  Clock,
} from "lucide-react";
import {
  formatUpdatedAt,
  isStaleAsOf,
  quickSearchTerms,
  type LaborMarketResponse,
} from "@/lib/labor-market";
import { Figure, usePrefersReducedMotion } from "./landing-shared";

interface GeneralSettings {
  siteName: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  heroBackgroundImage: string;
}

interface HeroSectionProps {
  generalSettings: GeneralSettings;
  /** Server-loaded aggregates; null when they could not be loaded (figures show "—"). */
  market?: LaborMarketResponse | null;
  isLoading?: boolean;
}

// "I am a…" paths. Existing routes only: /jobs redirects to /jobseeker/jobs
// (next.config.ts), and /employer/jobs, /signup/*, /login/admin are app routes.
const audiencePaths: Array<{
  title: string;
  detail: string;
  icon: React.ElementType;
  accent: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Jobseeker",
    detail: "Search open jobs and build your profile for referrals.",
    icon: Briefcase,
    accent: "bg-blue-100 text-blue-700",
    links: [
      { label: "Find jobs", href: "/jobs" },
      { label: "Create profile", href: "/signup/jobseeker" },
    ],
  },
  {
    title: "Employer",
    detail: "Post vacancies once PESO has reviewed your account.",
    icon: Building2,
    accent: "bg-indigo-100 text-indigo-700",
    links: [
      { label: "Post a vacancy", href: "/employer/jobs" },
      { label: "Register", href: "/signup/employer" },
    ],
  },
  {
    title: "PESO staff",
    detail: "Review employers, referrals and labour-market records.",
    icon: Landmark,
    accent: "bg-emerald-100 text-emerald-700",
    links: [{ label: "Staff login", href: "/login/admin" }],
  },
];

// Every statement here is something the platform actually does; numbers come
// from /api/public/labor-market and show "—" when unavailable.
const heroHighlights: Array<{
  title: string;
  detail: string;
  icon: React.ElementType;
  accent: string;
}> = [
  {
    title: "PESO-Reviewed Employers",
    detail: "Employer accounts are reviewed by PESO staff before they post",
    icon: ShieldCheck,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "AI + PESO",
    detail: "AI-assisted suggestions; people make the hiring decisions",
    icon: Zap,
    accent: "bg-amber-100 text-amber-700",
  },
  {
    title: "Free for Jobseekers",
    detail: "No fees to register, apply, or be referred",
    icon: HeartHandshake,
    accent: "bg-blue-100 text-blue-700",
  },
  {
    title: "Local Focus",
    detail: "Built with PESO General Santos City",
    icon: MapPin,
    accent: "bg-indigo-100 text-indigo-700",
  },
];

const heroBadgePhrases = ["Smart Matching", "PESO-Reviewed Employers", "Referral Tracking"];

const heroGradientStages = [
  "from-slate-50 via-white to-blue-50",
  "from-blue-50 via-white to-indigo-50",
  "from-indigo-50 via-white to-slate-50",
];

export function HeroSection({ generalSettings, market, isLoading = false }: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [heroGradientIndex, setHeroGradientIndex] = useState(0);
  const [activeHeroHighlight, setActiveHeroHighlight] = useState(0);
  const [heroBadgeIndex, setHeroBadgeIndex] = useState(0);

  const heroGradientClass = heroGradientStages[heroGradientIndex];

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setHeroGradientIndex((prev) => (prev + 1) % heroGradientStages.length);
    }, 9000);
    const highlightTimer = setInterval(() => {
      setActiveHeroHighlight((prev) => (prev + 1) % heroHighlights.length);
    }, 7000);
    const badgeTimer = setInterval(() => {
      setHeroBadgeIndex((prev) => (prev + 1) % heroBadgePhrases.length);
    }, 12000);
    return () => {
      clearInterval(timer);
      clearInterval(highlightTimer);
      clearInterval(badgeTimer);
    };
  }, [reducedMotion]);

  const handleHeroMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    setHeroTilt({
      x: (offsetX / rect.width) * 12,
      y: -(offsetY / rect.height) * 12,
    });
  };

  const resetHeroTilt = () => setHeroTilt({ x: 0, y: 0 });

  const totals = market?.totals;
  const rates = market?.successRates;
  const updatedAt = formatUpdatedAt(market?.asOf);
  const searchTerms = quickSearchTerms(market, 4);
  const chips = [...searchTerms.sectors, ...searchTerms.cities];

  // Staleness depends on the viewer's clock, so it is decided after hydration.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    setStale(isStaleAsOf(market?.asOf, Date.now()));
  }, [market?.asOf]);

  return (
    <section
      aria-labelledby="hero-heading"
      className={`relative w-full overflow-hidden bg-gradient-to-br ${heroGradientClass} pt-8 pb-16`}
    >
      {/* Background Pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: generalSettings.heroBackgroundImage
            ? `url('${generalSettings.heroBackgroundImage}')`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-16 w-[520px] h-[520px] bg-blue-200/40 blur-3xl rounded-full motion-safe:animate-pulse" />
        <div className="absolute -bottom-28 -left-20 w-[480px] h-[480px] bg-emerald-200/30 blur-3xl rounded-full motion-safe:animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-700 shadow-sm">
              <span>{generalSettings.siteName}</span>
              <span className="text-blue-700">{heroBadgePhrases[heroBadgeIndex]}</span>
            </div>

            {/* Main Heading */}
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
              {generalSettings.heroHeadline}
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              {generalSettings.heroSubheadline}
            </p>

            {/* Job search (GET /jobs?search=…, the param the jobs page reads) */}
            <form action="/jobs" method="get" role="search" className="max-w-xl">
              <label htmlFor="hero-job-search" className="block text-sm font-semibold text-slate-900">
                Search jobs
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row rounded-2xl border border-white/60 bg-white/80 p-2 shadow-sm backdrop-blur">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="hero-job-search"
                    name="search"
                    type="search"
                    placeholder="Job title or keyword"
                    aria-describedby="hero-job-search-note"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 font-semibold">
                  Search
                </Button>
              </div>
              {/* /jobs is behind jobseeker sign-in; say so up front. */}
              <p id="hero-job-search-note" className="mt-2 text-sm text-slate-600">
                Sign in or register as a jobseeker to see results.
              </p>
              {chips.length > 0 ? (
                <div className="mt-3">
                  <p id="hero-quick-search-label" className="text-xs font-semibold text-slate-700">
                    Sectors and places with the most open vacancies
                  </p>
                  <ul aria-labelledby="hero-quick-search-label" className="mt-2 flex flex-wrap gap-2">
                    {chips.map((term) => (
                      <li key={term}>
                        <Link
                          href={`/jobs?search=${encodeURIComponent(term)}`}
                          className="inline-flex max-w-[16rem] items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span className="truncate">{term}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </form>

            {/* Feature Highlights Grid */}
            <ul className="grid gap-3 sm:grid-cols-2">
              {heroHighlights.map((highlight, index) => (
                <li
                  key={highlight.title}
                  onMouseEnter={() => setActiveHeroHighlight(index)}
                  className={`rounded-2xl border backdrop-blur transition-all duration-300 p-4 flex items-start gap-3 ${
                    index === activeHeroHighlight
                      ? "bg-white/90 border-white shadow-lg"
                      : "bg-white/60 border-white/60 hover:bg-white/80"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${highlight.accent}`}
                  >
                    <highlight.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{highlight.title}</p>
                    <p className="text-xs text-slate-600">{highlight.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-8 py-5 text-base font-semibold"
              >
                <Link href="/jobs">
                  {generalSettings.primaryCTA}
                  <ChevronRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-slate-300/70 bg-white/80 backdrop-blur px-8 py-5 text-base font-semibold text-slate-900 hover:bg-white"
              >
                <Link href="/employer/jobs">{generalSettings.secondaryCTA}</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - real figures from /api/public/labor-market */}
          <div
            className="relative"
            onMouseMove={handleHeroMouseMove}
            onMouseLeave={resetHeroTilt}
          >
            <div
              className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 shadow-2xl overflow-hidden"
              style={{
                transform: `rotateX(${heroTilt.y}deg) rotateY(${heroTilt.x}deg)`,
                transition: "transform 0.12s ease-out",
              }}
            >
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-blue-50/70 via-transparent to-indigo-100/60 pointer-events-none" />
              <div className="relative space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">{updatedAt ? "Live snapshot" : "Snapshot"}</h2>
                  <p className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {updatedAt ? <>Updated <time dateTime={market?.asOf}>{updatedAt}</time></> : "Update time not available"}
                  </p>
                </div>
                {stale ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                    These figures are more than an hour old and may be out of date.
                  </p>
                ) : null}
                {/* Jobseekers card */}
                <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900">Registered jobseekers</p>
                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Active accounts</span>
                  </div>
                  <div className="min-h-[2.25rem] text-3xl font-bold text-slate-900 tabular-nums">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : <Figure value={totals?.jobseekers} />}
                  </div>
                  <p className="text-xs text-slate-600">Jobseeker profiles on GensanWorks</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <Users className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {isLoading ? "…" : <Figure value={totals?.employers} />}
                      </span>{" "}
                      approved employers
                    </span>
                  </div>
                </div>

                {/* Open jobs, vacancies and placement cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-white/95 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-600">Open job posts</p>
                    <div className="min-h-[2rem] text-2xl font-semibold text-slate-900 tabular-nums">
                      {isLoading ? <Skeleton className="h-7 w-16" /> : <Figure value={totals?.openJobs} />}
                    </div>
                    <p className="text-xs text-slate-600">Accepting applications</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/95 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-600">Open vacancies</p>
                    <div className="min-h-[2rem] text-2xl font-semibold text-slate-900 tabular-nums">
                      {isLoading ? <Skeleton className="h-7 w-16" /> : <Figure value={totals?.openVacancies} />}
                    </div>
                    <p className="text-xs text-slate-600">Across open job posts</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-100 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4">
                    <p className="text-xs uppercase tracking-wide text-white/90">Placement rate</p>
                    <div className="min-h-[2rem] text-2xl font-semibold tabular-nums">
                      {isLoading ? <Skeleton className="h-7 w-16 bg-white/20" /> : <Figure value={rates?.placementRate} kind="percent" />}
                    </div>
                    <p className="text-xs text-white/90">Referrals marked hired</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card - hired */}
            <div className="absolute -right-8 -bottom-6 hidden lg:block">
              <div className="rounded-2xl bg-white/95 border border-slate-100 shadow-lg p-4 w-44">
                <p className="text-xs text-slate-600 mb-1">Hired via referrals</p>
                <p className="text-base font-semibold text-slate-900 tabular-nums">
                  {isLoading ? "…" : <Figure value={rates?.hiredReferrals} />} placements
                </p>
                <p className="text-xs text-slate-600">Recorded by PESO</p>
              </div>
            </div>
          </div>
        </div>

        {/* "I am a…" path cards */}
        <nav aria-labelledby="hero-paths-heading" className="mt-16">
          <h2 id="hero-paths-heading" className="text-sm font-bold uppercase tracking-widest text-slate-700">
            I am a…
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {audiencePaths.map((path) => (
              <li
                key={path.title}
                className="flex h-full flex-col rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${path.accent}`}>
                    <path.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{path.title}</h3>
                </div>
                <p className="mt-2 flex-1 text-sm text-slate-600">{path.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {path.links.map((link, index) => (
                    <Button
                      key={link.href}
                      asChild
                      size="sm"
                      variant={index === 0 ? "default" : "outline"}
                      className={index === 0 ? "bg-blue-600 hover:bg-blue-700 font-semibold" : "border-slate-300 bg-white font-semibold text-slate-900"}
                    >
                      <Link href={link.href}>
                        {link.label}
                        <span className="sr-only"> ({path.title.toLowerCase()})</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
