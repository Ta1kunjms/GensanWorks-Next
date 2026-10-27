"use client";

import React from "react";
import { Users, Building2, Briefcase, BarChart3, ClipboardCheck, Handshake, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { LaborMarketResponse } from "@/lib/labor-market";
import { Accent, AsOfNote, CARD, CONTAINER, DataUnavailable, Figure, SECTION_Y, SectionHeader } from "./landing-shared";

interface ImpactMetricsSectionProps {
  market?: LaborMarketResponse;
  isLoading?: boolean;
  failed?: boolean;
}

// Our Impact in Numbers: real counts and rates from /api/public/labor-market.
// No period-change badges and no fallback figures; missing values show "—".
// Figures sit in <div>s, not <p>s, because the loading Skeleton is a <div>
// (a <div> inside a <p> is invalid HTML and caused a hydration error).
export function ImpactMetricsSection({ market, isLoading = false, failed = false }: ImpactMetricsSectionProps) {
  const totals = market?.totals;
  const rates = market?.successRates;
  const funnel = market?.funnel;

  const stats = [
    { label: "Registered Jobseekers", value: totals?.jobseekers, icon: Users, iconClass: "bg-blue-50 text-blue-700" },
    { label: "Approved Employers", value: totals?.employers, icon: Building2, iconClass: "bg-emerald-50 text-emerald-700" },
    { label: "Open Job Posts", value: totals?.openJobs, icon: Briefcase, iconClass: "bg-indigo-50 text-indigo-700" },
    { label: "Open Vacancies", value: totals?.openVacancies, icon: BarChart3, iconClass: "bg-amber-50 text-amber-700" },
  ];

  const funnelSteps = [
    { label: "Applications", value: funnel?.applications },
    { label: "Referrals", value: funnel?.referrals },
    { label: "Interview", value: funnel?.interview },
    { label: "Hired", value: funnel?.hired },
  ];

  const rateCards = [
    {
      title: "Placement rate",
      value: <Figure value={rates?.placementRate} kind="percent" />,
      note: `${formatCount(rates?.hiredReferrals)} of ${formatCount(rates?.referrals)} referrals marked hired`,
      icon: Handshake,
      frame: "bg-gradient-to-br from-blue-600 to-indigo-700",
      muted: "text-blue-50",
    },
    {
      title: "Application success rate",
      value: <Figure value={rates?.applicationSuccessRate} kind="percent" />,
      note: `${formatCount(rates?.hiredApplications)} of ${formatCount(rates?.applications)} applications marked hired`,
      icon: ClipboardCheck,
      frame: "bg-gradient-to-br from-emerald-700 to-teal-800",
      muted: "text-emerald-50",
    },
    {
      title: "Hired through referrals",
      value: <Figure value={rates?.hiredReferrals} />,
      note: "Placements recorded by PESO",
      icon: Award,
      frame: "border border-slate-800 bg-slate-900",
      muted: "text-slate-300",
    },
  ];

  return (
    <section aria-labelledby="impact-heading" className={`relative w-full overflow-hidden bg-slate-50 ${SECTION_Y}`}>
      {/* Decorative Orbs */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className={CONTAINER}>
        <SectionHeader
          id="impact-heading"
          eyebrow="Our Track Record"
          icon={BarChart3}
          title={<>Our Impact in <Accent>Numbers</Accent></>}
          lead="Counts and outcome rates taken from GensanWorks records."
        />

        {failed ? <DataUnavailable /> : null}

        {/* Main Stats Grid */}
        <ul className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <li key={stat.label} className={`${CARD} flex h-full flex-col p-6`}>
              <div aria-hidden="true" className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
              <div className="mt-1 text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                {isLoading ? <Skeleton className="h-10 w-24" /> : <Figure value={stat.value} />}
              </div>
            </li>
          ))}
        </ul>

        {/* Success rates bento */}
        <div className="mb-6 grid gap-6 md:grid-cols-3">
          {rateCards.map((card) => (
            <div key={card.title} className={`relative flex h-full flex-col overflow-hidden rounded-2xl p-6 text-white shadow-sm md:p-8 ${card.frame}`}>
              <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div aria-hidden="true" className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className={`text-base font-semibold ${card.muted}`}>{card.title}</h3>
                <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
                  {isLoading ? <Skeleton className="h-10 w-20 bg-white/20" /> : card.value}
                </div>
                <p className={`mt-2 text-sm ${card.muted}`}>{card.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Placement funnel */}
        <div className={`${CARD} p-6 md:p-8`}>
          <h3 className="text-xl font-semibold text-slate-900">Placement funnel</h3>
          <p className="mt-1 mb-6 max-w-3xl text-base text-slate-600">
            Applications and PESO referrals, then the jobseeker–job pairs now at interview and those hired
            (an application and its referral for the same job count once). Figures grow as applications and referrals are recorded.
          </p>
          <ol className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {funnelSteps.map((step, index) => (
              <li key={step.label} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.label}
                </p>
                <div className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <Figure value={step.value} />}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <AsOfNote asOf={market?.asOf} className="mt-8 text-center" />
      </div>
    </section>
  );
}
