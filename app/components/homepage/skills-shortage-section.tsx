"use client";

import React from "react";
import Link from "next/link";
import { TrendingDown, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { SkillGapRow } from "@/lib/labor-market";
import { DataUnavailable } from "./landing-shared";

interface SkillsShortageSectionProps {
  gaps?: SkillGapRow[];
  loading?: boolean;
  failed?: boolean;
}

// Largest skill gaps: vacancies that list a skill minus the jobseekers who list it.
// Replaces the old projected-shortage cards, which were invented figures.
const nextSteps = [
  {
    title: "For jobseekers",
    description: "Add every skill and training you have to your profile so it can be matched to these posts.",
    href: "/signup/jobseeker",
    cta: "Create a jobseeker profile",
  },
  {
    title: "For employers",
    description: "List the specific skills a vacancy needs; it makes the demand side of this view more accurate.",
    href: "/signup/employer",
    cta: "Register as an employer",
  },
];

export function SkillsShortageSection({ gaps = [], loading = false, failed = false }: SkillsShortageSectionProps) {
  return (
    <section aria-labelledby="skill-gaps-heading" className="w-full bg-slate-50 py-32 relative overflow-hidden">
      {/* Decorative Grid */}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <TrendingDown className="w-4 h-4" aria-hidden="true" />
            Skills Gap Tracker
          </div>
          <h2 id="skill-gaps-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Largest Skill <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Gaps</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Skills where open vacancies outnumber the registered jobseekers who list them. A descriptive count, not a forecast.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Gap Cards */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-900 px-2">Ranked by gap size</h3>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-[1.5rem]" />
                ))}
              </div>
            ) : failed ? (
              <DataUnavailable />
            ) : gaps.length === 0 ? (
              <p className="rounded-[1.5rem] bg-white border border-slate-200/60 p-8 text-slate-600 font-medium">
                No skill gaps right now: for every skill on open posts, at least as many jobseekers list it as there are vacancies.
              </p>
            ) : (
              <ol className="grid sm:grid-cols-2 gap-4">
                {gaps.map((item, index) => (
                  <li
                    key={item.skill}
                    className="group relative bg-white rounded-[1.5rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all duration-300"
                  >
                    <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-100 to-orange-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <span className="text-sm font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                          Gap: {formatCount(item.gap)}
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                          <span className="sr-only">Rank </span>#{index + 1}
                        </span>
                      </div>

                      <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-rose-700 transition-colors">
                        {item.skill}
                      </h4>

                      <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Vacancies</dt>
                          <dd className="text-sm font-bold text-slate-800 tabular-nums">{formatCount(item.demand)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Jobseekers</dt>
                          <dd className="text-sm font-bold text-slate-800 tabular-nums">{formatCount(item.supply)}</dd>
                        </div>
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* What to do next */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900 text-white rounded-[1.5rem] p-8 shadow-2xl relative overflow-hidden">
              <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold tracking-widest uppercase mb-4 border border-white/5">
                  How It Is Counted
                </div>
                <h3 className="text-2xl font-bold mb-3">Gap = vacancies − jobseekers</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Vacancies are summed over open posts that list the skill. Jobseekers are active, consented
                  profiles that are looking for work and list the same skill (spelling is matched exactly,
                  ignoring case).
                </p>
              </div>
            </div>

            {nextSteps.map((step) => (
              <div
                key={step.title}
                className="group relative bg-white rounded-[1.5rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div aria-hidden="true" className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg">{step.title}</h4>
                </div>
                <p className="text-sm text-slate-600 mb-4 pl-[3.25rem]">{step.description}</p>
                <div className="pl-[3.25rem]">
                  <Link href={step.href} className="text-sm font-semibold text-blue-700 hover:underline">
                    {step.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
