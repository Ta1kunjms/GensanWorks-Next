"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  TrendingUp,
  Video,
} from "lucide-react";

interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  aboutTitle: string;
  aboutBody: string;
  heroBackgroundImage: string;
  seoKeywords: string;
}

interface HeroSectionProps {
  generalSettings: GeneralSettings;
  isLoading: boolean;
  animatedJobseekers: number;
  animatedEmployers: number;
  animatedMatches: number;
  activeHeroBadge: { title: string; description: string };
  impactLoading?: boolean;
  impactData?: {
    avgTimeToInterview: string;
    avgSalary: string;
    satisfactionRate: string;
    yearsOfService: number;
  };
}

const heroHighlights: Array<{
  title: string;
  detail: string;
  icon: React.ElementType;
  accent: string;
}> = [
  {
    title: "48h Interview Rate",
    detail: "Candidates hear back within two days",
    icon: Clock,
    accent: "bg-blue-100 text-blue-700",
  },
  {
    title: "100% Verified",
    detail: "No fake job posts or ghost employers",
    icon: Shield,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "AI + PESO",
    detail: "Hybrid review ensures better matches",
    icon: Zap,
    accent: "bg-amber-100 text-amber-700",
  },
  {
    title: "Regional Reach",
    detail: "Nationwide jobs curated for GenSan",
    icon: Globe,
    accent: "bg-indigo-100 text-indigo-700",
  },
];

const heroGradientStages = [
  "from-slate-50 via-white to-blue-50",
  "from-blue-50 via-white to-indigo-50",
  "from-indigo-50 via-white to-slate-50",
];

export function HeroSection({
  generalSettings,
  isLoading,
  animatedJobseekers,
  animatedEmployers,
  animatedMatches,
  activeHeroBadge,
  impactLoading,
  impactData,
}: HeroSectionProps) {
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [heroGradientIndex, setHeroGradientIndex] = useState(0);
  const [activeHeroHighlight, setActiveHeroHighlight] = useState(0);

  const heroGradientClass = heroGradientStages[heroGradientIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroGradientIndex((prev) => (prev + 1) % heroGradientStages.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const highlightTimer = setInterval(() => {
      setActiveHeroHighlight((prev) => (prev + 1) % heroHighlights.length);
    }, 7000);
    return () => clearInterval(highlightTimer);
  }, []);

  const handleHeroMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    setHeroTilt({
      x: (offsetX / rect.width) * 12,
      y: -(offsetY / rect.height) * 12,
    });
  };

  const resetHeroTilt = () => setHeroTilt({ x: 0, y: 0 });

  const heroStats = [
    {
      label: "Active Jobseekers",
      value: animatedJobseekers,
      description: "Profiles verified this quarter",
    },
    {
      label: "Partner Employers",
      value: animatedEmployers,
      description: "Business owners hiring now",
    },
    {
      label: "Jobs Matched",
      value: animatedMatches,
      description: "Successful placements to date",
    },
  ];

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <section
      className={`relative w-full overflow-hidden bg-gradient-to-br ${heroGradientClass} pt-8 pb-16`}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: generalSettings.heroBackgroundImage
            ? `url('${generalSettings.heroBackgroundImage}')`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-16 w-[520px] h-[520px] bg-blue-200/40 blur-3xl rounded-full animate-pulse" />
        <div className="absolute -bottom-28 -left-20 w-[480px] h-[480px] bg-emerald-200/30 blur-3xl rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-700 shadow-sm">
              <span>{generalSettings.siteName}</span>
              <span className="text-blue-600">
                {activeHeroBadge?.title || "Smart Matching"}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
              {generalSettings.heroHeadline}
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              {generalSettings.heroSubheadline}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {heroHighlights.map((highlight, index) => (
                <div
                  key={highlight.title}
                  onMouseEnter={() => setActiveHeroHighlight(index)}
                  className={`rounded-2xl border backdrop-blur transition-all duration-300 p-4 flex items-start gap-3 cursor-pointer ${
                    index === activeHeroHighlight
                      ? "bg-white/90 border-white shadow-lg"
                      : "bg-white/60 border-white/60 hover:bg-white/80"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight.accent}`}
                  >
                    <highlight.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {highlight.title}
                    </p>
                    <p className="text-xs text-slate-600">{highlight.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/jobs" className="flex-1 sm:flex-initial">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-8 py-5 text-base font-semibold"
                >
                  {generalSettings.primaryCTA}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/employer/jobs" className="flex-1 sm:flex-initial">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-slate-300/70 bg-white/80 backdrop-blur px-8 py-5 text-base font-semibold text-slate-900 hover:bg-white"
                >
                  {generalSettings.secondaryCTA}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - Stats Cards with Tilt */}
          <div
            className="relative hidden lg:block"
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/70 via-transparent to-indigo-100/60 pointer-events-none" />
              <div className="relative space-y-5">
                {/* Live matches card */}
                <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900">Live matches</p>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Realtime</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(Math.max(animatedMatches, 0))}
                  </p>
                  <p className="text-xs text-slate-500">Successful placements tracked</p>
                  <div className="mt-3 flex -space-x-2">
                    {['AL', 'JM', 'KR'].map((initials) => (
                      <div key={initials} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white text-xs font-semibold text-slate-600 flex items-center justify-center">
                        {initials}
                      </div>
                    ))}
                    <span className="text-xs text-slate-500 ml-3">New hires this week</span>
                  </div>
                </div>

                {/* Alert + Satisfaction cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4">
                    <p className="text-xs uppercase tracking-wide text-white/70">Alerts</p>
                    <p className="text-2xl font-semibold">
                      {impactLoading ? <Skeleton className="h-7 w-16 bg-white/20" /> : impactData?.satisfactionRate || '94%'}
                    </p>
                    <p className="text-xs text-white/75">Platform satisfaction</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/95 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Avg salary</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {impactLoading ? <Skeleton className="h-7 w-16" /> : impactData?.avgSalary || '₱32.5K'}
                    </p>
                    <p className="text-xs text-slate-500">Starting offers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card - Next orientation */}
            <div className="absolute -left-10 top-12">
              <div className="rounded-2xl bg-white border border-slate-100 shadow-lg p-4 w-48">
                <p className="text-xs text-slate-500 mb-1">Next orientation</p>
                <p className="text-base font-semibold text-slate-900">Wednesday · 9:00 AM</p>
                <p className="text-xs text-slate-500">City Hall PESO Hub</p>
              </div>
            </div>

            {/* Floating card - Instant alerts */}
            <div className="absolute -right-8 -bottom-6">
              <div className="rounded-2xl bg-white/95 border border-slate-100 shadow-lg p-4 w-40">
                <p className="text-xs text-slate-500 mb-1">Instant alerts</p>
                <p className="text-base font-semibold text-slate-900">15 new job leads</p>
                <div className="mt-2 flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +6% today
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}