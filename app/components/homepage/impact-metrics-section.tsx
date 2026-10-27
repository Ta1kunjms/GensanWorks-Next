"use client";

import React from "react";
import { Users, Building2, Briefcase, BarChart3, ClipboardCheck, Handshake, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { LaborMarketResponse } from "@/lib/labor-market";
import { AsOfNote, DataUnavailable, Figure } from "./landing-shared";

interface ImpactMetricsSectionProps {
  market?: LaborMarketResponse;
  isLoading?: boolean;
  failed?: boolean;
}

// Our Impact in Numbers: real counts and rates from /api/public/labor-market.
// No period-change badges and no fallback figures; missing values show "—".
export function ImpactMetricsSection({ market, isLoading = false, failed = false }: ImpactMetricsSectionProps) {
  const totals = market?.totals;
  const rates = market?.successRates;
  const funnel = market?.funnel;

  const stats = [
    { label: "Registered Jobseekers", value: totals?.jobseekers, icon: Users, iconClass: "text-blue-600", ring: "from-blue-500/10 to-indigo-500/10 border-blue-500/20", hover: "from-blue-50/50" },
    { label: "Approved Employers", value: totals?.employers, icon: Building2, iconClass: "text-emerald-600", ring: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20", hover: "from-emerald-50/50" },
    { label: "Open Job Posts", value: totals?.openJobs, icon: Briefcase, iconClass: "text-purple-600", ring: "from-purple-500/10 to-pink-500/10 border-purple-500/20", hover: "from-purple-50/50" },
    { label: "Open Vacancies", value: totals?.openVacancies, icon: BarChart3, iconClass: "text-amber-600", ring: "from-amber-500/10 to-orange-500/10 border-amber-500/20", hover: "from-amber-50/50" },
  ];

  const funnelSteps = [
    { label: "Applications", value: funnel?.applications },
    { label: "Referrals", value: funnel?.referrals },
    { label: "Interview", value: funnel?.interview },
    { label: "Hired", value: funnel?.hired },
  ];

  return (
    <section aria-labelledby="impact-heading" className="w-full bg-slate-50 py-32 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            Our Track Record
          </div>
          <h2 id="impact-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Our Impact in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Numbers</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Counts and outcome rates taken from GensanWorks records.
          </p>
        </div>

        {failed ? <DataUnavailable /> : null}

        {/* Main Stats Grid */}
        <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <li key={stat.label} className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border border-slate-200/60 transition-all duration-500 relative overflow-hidden">
              <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${stat.hover} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div aria-hidden="true" className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.ring} flex items-center justify-center border group-hover:scale-110 transition-transform duration-500`}>
                    <stat.icon className={`w-6 h-6 ${stat.iconClass}`} />
                  </div>
                </div>
                <div>
                  <p className="text-slate-600 font-semibold text-sm mb-2">{stat.label}</p>
                  <div className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                    {isLoading ? <Skeleton className="h-10 w-24" /> : <Figure value={stat.value} />}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Success rates bento */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div aria-hidden="true" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <Handshake className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-blue-50 font-semibold mb-2">Placement rate</h3>
              <div className="text-4xl font-black tracking-tight tabular-nums">
                {isLoading ? <Skeleton className="h-10 w-20 bg-white/20" /> : <Figure value={rates?.placementRate} kind="percent" />}
              </div>
              <p className="mt-2 text-sm text-blue-50">
                {formatCount(rates?.hiredReferrals)} of {formatCount(rates?.referrals)} referrals marked hired
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div aria-hidden="true" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-emerald-50 font-semibold mb-2">Application success rate</h3>
              <div className="text-4xl font-black tracking-tight tabular-nums">
                {isLoading ? <Skeleton className="h-10 w-20 bg-white/20" /> : <Figure value={rates?.applicationSuccessRate} kind="percent" />}
              </div>
              <p className="mt-2 text-sm text-emerald-50">
                {formatCount(rates?.hiredApplications)} of {formatCount(rates?.applications)} applications marked hired
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div aria-hidden="true" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/10 backdrop-blur-sm">
                <Award className="w-5 h-5 text-blue-300" />
              </div>
              <h3 className="text-slate-300 font-semibold mb-2">Hired through referrals</h3>
              <div className="text-4xl font-black tracking-tight tabular-nums">
                {isLoading ? <Skeleton className="h-10 w-20 bg-white/10" /> : <Figure value={rates?.hiredReferrals} />}
              </div>
              <p className="mt-2 text-sm text-slate-300">Placements recorded by PESO</p>
            </div>
          </div>
        </div>

        {/* Placement funnel */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
          <h3 className="text-xl font-bold text-slate-900 mb-1">Placement funnel</h3>
          <p className="text-sm text-slate-600 mb-6">
            Applications and PESO referrals, then the jobseeker–job pairs now at interview and those hired
            (an application and its referral for the same job count once). Figures grow as applications and referrals are recorded.
          </p>
          <ol className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {funnelSteps.map((step, index) => (
              <li key={step.label} className="rounded-2xl border border-slate-200/60 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.label}
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900 tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <Figure value={step.value} />}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <AsOfNote asOf={market?.asOf} className="mt-8 text-center" />
      </div>
    </section>
  );
}
