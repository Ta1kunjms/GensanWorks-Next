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
    <section className="w-full bg-slate-50 py-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-rose-600 mb-3">
            Labor Market Insights
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Expected Skills Shortage
          </h2>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            Projected workforce gaps in General Santos region. Data-driven insights to help jobseekers and employers plan ahead.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_0.8fr] gap-8">
          {/* Shortage Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-[0.25em]">
                  Forecast
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  Clusters likely to feel the crunch
                </h3>
              </div>
              <span className="text-xs text-slate-500">Demo dataset</span>
            </div>
            <div className="space-y-4">
              {shortageData.map((item) => (
                <div
                  key={item.skillCluster}
                  className="bg-slate-50 rounded-xl border border-slate-100 p-4 hover:border-rose-200 hover:shadow-md transition-all"
                >
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                      {item.projectedGap}
                    </span>
                    <p className="text-sm text-slate-500 font-medium">
                      {item.timeframe}
                    </p>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    {item.skillCluster}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Driver: {item.driver}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mt-2">
                    Priority Focus
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.focus}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="space-y-5">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                Suggested Actions
              </p>
              <h3 className="text-2xl font-bold mt-2">
                What PESO can launch next
              </h3>
              <p className="text-sm text-white/80 mt-2">
                These demo playbooks turn insights into programs. Swap them for live projects later.
              </p>
            </div>
            {initiatives.map((initiative) => (
              <div
                key={initiative.title}
                className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">
                    {initiative.title}
                  </h4>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-slate-600">
                  {initiative.description}
                </p>
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  {initiative.owner}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}