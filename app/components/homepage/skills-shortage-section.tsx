"use client";

import React from "react";
import { TrendingDown, CheckCircle } from "lucide-react";

interface ShortageData {
  skillCluster: string;
  projectedGap: string;
  timeframe: string;
  driver: string;
  focus: string;
}

interface ShortageInitiative {
  title: string;
  description: string;
  owner: string;
}

interface SkillsShortageSectionProps {
  shortageData?: ShortageData[];
  initiatives?: ShortageInitiative[];
  loading?: boolean;
}

const defaultShortage = [
  {
    skillCluster: "AI-ready Developers",
    projectedGap: "300 roles",
    timeframe: "Q1–Q3 2025",
    driver: "Fintech and logistics platforms rolling out automation",
    focus: "Full stack + data pipeline",
  },
  {
    skillCluster: "Healthcare Support",
    projectedGap: "220 roles",
    timeframe: "Next 12 months",
    driver: "Regional hospital expansion and aging population",
    focus: "Patient care + inventory",
  },
  {
    skillCluster: "Certified Welders",
    projectedGap: "180 roles",
    timeframe: "Before new export hub opens",
    driver: "Fabrication contracts in SOCCSKSARGEN",
    focus: "NC II + safety compliance",
  },
  {
    skillCluster: "CX Specialists",
    projectedGap: "150 roles",
    timeframe: "Next 2 quarters",
    driver: "BPO providers scaling GenSan pods",
    focus: "Omnichannel support",
  },
];

const defaultInitiatives = [
  {
    title: "Scholarship Slots",
    description: "Allocate 120 TESDA-backed seats for AI and automation tracks.",
    owner: "PESO + TESDA",
  },
  {
    title: "Employer Bootcamps",
    description: "Run joint clinics with hospitals and steelworks to co-design training.",
    owner: "Industry Desk",
  },
  {
    title: "CX Career Sprint",
    description: "Two-week finishing course to convert hospitality workers into CX hires.",
    owner: "Job Center",
  },
];

export function SkillsShortageSection({
  shortageData = defaultShortage,
  initiatives = defaultInitiatives,
  loading = false,
}: SkillsShortageSectionProps) {
  return (
    <section className="w-full bg-slate-50 py-32 relative overflow-hidden">
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <TrendingDown className="w-4 h-4" />
            Skills Shortage Tracker
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Expected Skills <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Shortage</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Projected workforce gaps in General Santos. Data-driven insights to help jobseekers and employers plan ahead.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Shortage Cards */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-2xl font-bold text-slate-900">
                Clusters Likely to Feel the Crunch
              </h3>
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Live Demo Dataset
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {shortageData.map((item) => (
                <div
                  key={item.skillCluster}
                  className="group relative bg-white rounded-[1.5rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-100 to-orange-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <span className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                        Gap: {item.projectedGap}
                      </span>
                      <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                        {item.timeframe}
                      </span>
                    </div>
                    
                    <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-rose-600 transition-colors">
                      {item.skillCluster}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Key Driver
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.driver}
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Priority Focus
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {item.focus}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 text-white rounded-[1.5rem] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold tracking-widest uppercase mb-4 border border-white/5">
                  Suggested Actions
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  What PESO can launch next
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  These demo playbooks turn insights into programs.
                </p>
              </div>
            </div>
            
            {initiatives.map((initiative) => (
              <div
                key={initiative.title}
                className="group relative bg-white rounded-[1.5rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg">
                      {initiative.title}
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4 pl-[3.25rem]">
                  {initiative.description}
                </p>
                <div className="pl-[3.25rem]">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                    Owner: {initiative.owner}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}