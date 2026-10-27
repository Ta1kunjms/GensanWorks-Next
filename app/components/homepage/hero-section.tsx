"use client";

import React, { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Zap,
  HeartHandshake,
  Globe,
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { LaborMarketResponse } from "@/lib/labor-market";
import { formatCount, formatPeso } from "@/lib/utils";
import { Figure, usePrefersReducedMotion } from "./landing-shared";

// Live hero look 2026-10-27: same layout, sizes and shadows as the hero deployed
// from commit 8c4e1b4, with every figure taken from /api/public/labor-market.
// Missing figures show "—" (read as "Not available"); nothing is invented.

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
  market?: LaborMarketResponse;
  isLoading: boolean;
}

// Icon-chip colours follow the deployed hero's card positions.
const HIGHLIGHT_ACCENTS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

const heroGradientStages = [
  "from-slate-50 via-white to-blue-50",
  "from-blue-50 via-white to-indigo-50",
  "from-indigo-50 via-white to-slate-50",
];

/** Up to two initials from an employer's name, e.g. "Tuna Grill Inc." -> "TG". */
function employerInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase());
  return letters.slice(0, 2).join("") || "?";
}

export function HeroSection({ generalSettings, market, isLoading }: HeroSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [heroGradientIndex, setHeroGradientIndex] = useState(0);
  const [activeHeroHighlight, setActiveHeroHighlight] = useState(0);

  const heroGradientClass = heroGradientStages[heroGradientIndex];

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setHeroGradientIndex((prev) => (prev + 1) % heroGradientStages.length);
    }, 9000);
    const highlightTimer = setInterval(() => {
      setActiveHeroHighlight((prev) => (prev + 1) % HIGHLIGHT_ACCENTS.length);
    }, 7000);
    return () => {
      clearInterval(timer);
      clearInterval(highlightTimer);
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
  const salary = market?.salaryOverall;
  const hiringNames = (market?.employersHiringNow ?? []).map((row) => row.name).slice(0, 3);

  // Placement rate (referrals marked Hired); falls back to the application hire rate.
  const usesApplicationRate = rates?.placementRate == null && rates?.applicationSuccessRate != null;
  const rateValue = rates?.placementRate ?? rates?.applicationSuccessRate ?? null;

  const newJobseekers = market?.jobseekersNewThisMonth;
  // Real change against the previous 30 days; null (line hidden) when there is nothing to compare with.
  const signupChange = market?.jobseekersNewChangePct ?? null;

  const highlights: Array<{ title: React.ReactNode; key: string; detail: string; icon: React.ElementType }> = [
    {
      key: "reviewed",
      title: "PESO-Reviewed Employers",
      detail: "Employer accounts are reviewed by PESO staff before they post",
      icon: ShieldCheck,
    },
    {
      key: "ai",
      title: "AI + PESO",
      detail: "AI-assisted suggestions; people make the hiring decisions",
      icon: Zap,
    },
    {
      key: "free",
      title: "Free for Jobseekers",
      detail: "No fees to register, apply, or be referred",
      icon: HeartHandshake,
    },
    {
      key: "employers",
      title: (
        <>
          {isLoading ? (
            <Skeleton className="mr-1 inline-block h-3.5 w-8 align-middle" />
          ) : (
            <span className="tabular-nums">
              <Figure value={totals?.employers} />
            </span>
          )}{" "}
          Employers
        </>
      ),
      detail: "Approved employers posting across Mindanao",
      icon: Globe,
    },
  ];

  const backgroundImage = generalSettings.heroBackgroundImage
    ? `url(${JSON.stringify(generalSettings.heroBackgroundImage)})`
    : undefined;

  return (
    <section
      aria-labelledby="hero-heading"
      className={`relative w-full overflow-hidden bg-gradient-to-br ${heroGradientClass} pt-8 pb-16`}
    >
      {/* Faded background photo (decorative) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-16 w-[520px] h-[520px] bg-blue-200/40 blur-3xl rounded-full motion-safe:animate-pulse" />
        <div className="absolute -bottom-28 -left-20 w-[480px] h-[480px] bg-emerald-200/30 blur-3xl rounded-full motion-safe:animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          {/* Left Content */}
          <div className="min-w-0 space-y-6">
            {/* Badge */}
            <p className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-700 shadow-sm">
              <span>{generalSettings.siteName}</span>
              <span className="text-blue-700">Smart Matching</span>
            </p>

            {/* Main Heading */}
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
              {generalSettings.heroHeadline}
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              {generalSettings.heroSubheadline}
            </p>

            {/* Feature Highlights Grid */}
            <ul className="grid gap-3 sm:grid-cols-2">
              {highlights.map((highlight, index) => (
                <li
                  key={highlight.key}
                  onMouseEnter={() => setActiveHeroHighlight(index)}
                  className={`rounded-2xl border backdrop-blur transition-[background-color,box-shadow,border-color] duration-300 p-4 flex items-start gap-3 ${
                    index === activeHeroHighlight
                      ? "bg-white/90 border-white shadow-lg"
                      : "bg-white/60 border-white/60 hover:bg-white/80"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${HIGHLIGHT_ACCENTS[index]}`}
                  >
                    <highlight.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{highlight.title}</div>
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
                className="h-12 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-8 text-base font-semibold"
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
                className="h-12 w-full sm:w-auto border-slate-300/70 bg-white/80 backdrop-blur px-8 text-base font-semibold text-slate-900 hover:bg-white"
              >
                <Link href="/employer/jobs">{generalSettings.secondaryCTA}</Link>
              </Button>
            </div>

            {/* Job search (GET /jobs?search=…, the param the jobs page reads) */}
            <form action="/jobs" method="get" role="search" className="max-w-xl">
              <label htmlFor="hero-job-search" className="block text-sm font-semibold text-slate-900">
                Search jobs
              </label>
              <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-2 shadow-sm sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="hero-job-search"
                    name="search"
                    type="search"
                    placeholder="Job title or keyword"
                    aria-describedby="hero-job-search-note"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 rounded-xl bg-blue-600 px-6 text-base font-semibold hover:bg-blue-700">
                  Search
                </Button>
              </div>
              {/* /jobs is behind jobseeker sign-in; say so up front. */}
              <p id="hero-job-search-note" className="mt-2 text-sm text-slate-600">
                Sign in or register as a jobseeker to see results.
              </p>
            </form>
          </div>

          {/* Right Content - stats card with tilt; figures from /api/public/labor-market */}
          <div
            className="relative min-w-0 grid grid-cols-2 gap-3 lg:block"
            onMouseMove={handleHeroMouseMove}
            onMouseLeave={resetHeroTilt}
          >
            <h2 className="sr-only">GensanWorks at a glance</h2>
            <div
              className="relative col-span-2 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[32px] p-5 sm:p-8 lg:py-16 shadow-2xl overflow-hidden"
              style={{
                transform: `rotateX(${heroTilt.y}deg) rotateY(${heroTilt.x}deg)`,
                transition: "transform 0.12s ease-out",
              }}
            >
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-blue-50/70 via-transparent to-indigo-100/60 pointer-events-none" />
              <div className="relative space-y-5">
                {/* Open vacancies card */}
                <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-900">Job openings</p>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Live data</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 tabular-nums">
                    {isLoading ? <Skeleton className="h-9 w-24" /> : <Figure value={totals?.openVacancies} />}
                  </div>
                  <p className="text-xs text-slate-600">Open vacancies tracked</p>
                  <div className="mt-3 flex items-center">
                    {isLoading ? (
                      <div className="flex -space-x-2" aria-hidden="true">
                        {[0, 1, 2].map((slot) => (
                          <Skeleton key={slot} className="w-8 h-8 rounded-full border-2 border-white" />
                        ))}
                      </div>
                    ) : hiringNames.length > 0 ? (
                      <div className="flex -space-x-2">
                        {hiringNames.map((name) => (
                          <span
                            key={name}
                            title={name}
                            aria-hidden="true"
                            className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white text-xs font-semibold text-slate-700 flex items-center justify-center"
                          >
                            {employerInitials(name)}
                          </span>
                        ))}
                        <span className="sr-only">{hiringNames.join(", ")}:</span>
                      </div>
                    ) : null}
                    <span className="text-xs text-slate-600 ml-3">
                      {!isLoading && market && hiringNames.length === 0 ? "No employers with open posts yet" : "Employers hiring now"}
                    </span>
                  </div>
                </div>

                {/* Placement rate + median salary tiles */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4">
                    <p className="text-xs uppercase tracking-wide text-white/90">Placement rate</p>
                    <div className="text-2xl font-semibold tabular-nums">
                      {isLoading ? <Skeleton className="h-8 w-16 bg-white/20" /> : <Figure value={rateValue} kind="percent" />}
                    </div>
                    <p className="text-xs text-white/90">
                      {usesApplicationRate ? "Applications marked hired" : "Referrals marked hired"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/95 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-600">Median salary</p>
                    <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : salary && salary.n > 0 && salary.medianMonthly !== null ? (
                        formatPeso(salary.medianMonthly, { compact: true })
                      ) : (
                        <Figure value={null} />
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      Median monthly offer ({isLoading ? "…" : formatCount(salary?.n)} {salary?.n === 1 ? "post" : "posts"})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card - open job posts (top-left) */}
            <div className="lg:absolute lg:-left-10 lg:-top-10">
              <div className="h-full rounded-2xl bg-white border border-slate-100 shadow-lg p-4 lg:w-48">
                <p className="text-xs text-slate-600 mb-1">Total active jobs</p>
                <div className="text-base font-semibold text-slate-900 tabular-nums">
                  {isLoading ? (
                    <Skeleton className="inline-block h-5 w-24 align-middle" />
                  ) : (
                    <>
                      <Figure value={totals?.openJobs} /> {totals?.openJobs === 1 ? "job post" : "job posts"}
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-600">Live on platform</p>
              </div>
            </div>

            {/* Floating card - new jobseekers in the last 30 days (bottom-right) */}
            <div className="lg:absolute lg:-right-8 lg:-bottom-10">
              <div className="h-full rounded-2xl bg-white/95 border border-slate-100 shadow-lg p-4 lg:w-40">
                <p className="text-xs text-slate-600 mb-1">New this month</p>
                <div className="text-base font-semibold text-slate-900 tabular-nums">
                  {isLoading ? (
                    <Skeleton className="inline-block h-5 w-24 align-middle" />
                  ) : (
                    <>
                      <Figure value={newJobseekers} /> {newJobseekers === 1 ? "jobseeker" : "jobseekers"}
                    </>
                  )}
                </div>
                {!isLoading && signupChange !== null ? (
                  <div
                    className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
                      signupChange >= 0 ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {signupChange >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {signupChange > 0 ? "+" : ""}
                      {signupChange.toLocaleString("en-PH", { maximumFractionDigits: 1 })}% vs previous 30 days
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
