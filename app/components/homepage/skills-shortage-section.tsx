"use client";

import React from "react";
import Link from "next/link";
import { TrendingDown, CheckCircle, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { SkillGapRow } from "@/lib/labor-market";
import { CARD, CARD_DARK, CONTAINER, DataUnavailable, SECTION_Y, SectionHeader } from "./landing-shared";

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
    <section aria-labelledby="skill-gaps-heading" className={`relative w-full overflow-hidden bg-slate-50 ${SECTION_Y}`}>
      {/* Decorative Grid */}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className={CONTAINER}>
        <SectionHeader
          id="skill-gaps-heading"
          eyebrow="Skills Gap Tracker"
          icon={TrendingDown}
          title={<>Largest Skill <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Gaps</span></>}
          lead="Skills where open vacancies outnumber the registered jobseekers who list them. A descriptive count, not a forecast."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Gap Cards */}
          <div className="min-w-0">
            <h3 className="mb-6 text-xl font-semibold text-slate-900">Ranked by gap size</h3>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
              </div>
            ) : failed ? (
              <DataUnavailable />
            ) : gaps.length === 0 ? (
              <p className={`${CARD} p-6 text-base font-medium text-slate-600 md:p-8`}>
                No skill gaps right now: for every skill on open posts, at least as many jobseekers list it as there are vacancies.
              </p>
            ) : (
              <ol className="grid gap-4 sm:grid-cols-2">
                {gaps.map((item, index) => (
                  <li key={item.skill} className={`${CARD} flex h-full flex-col p-6`}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 tabular-nums">
                        Gap: {formatCount(item.gap)}
                      </span>
                      <span className="text-sm font-semibold text-slate-600 tabular-nums">
                        <span className="sr-only">Rank </span>#{index + 1}
                      </span>
                    </div>

                    <h4 className="mb-4 text-lg font-semibold text-slate-900">
                      {item.skill}
                    </h4>

                    <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-600">Vacancies</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCount(item.demand)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-600">Jobseekers</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCount(item.supply)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* What to do next */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className={`${CARD_DARK} relative overflow-hidden p-6 md:p-8`}>
              <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
                  How It Is Counted
                </p>
                <h3 className="mt-4 text-xl font-semibold">Gap = vacancies − jobseekers</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-300">
                  Vacancies are summed over open posts that list the skill. Jobseekers are active, consented
                  profiles that are looking for work and list the same skill (spelling is matched exactly,
                  ignoring case).
                </p>
              </div>
            </div>

            {nextSteps.map((step) => (
              <div key={step.title} className={`${CARD} p-6`}>
                <div className="mb-3 flex items-center gap-3">
                  <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">{step.title}</h4>
                </div>
                <p className="text-base text-slate-600">{step.description}</p>
                <Link href={step.href} className="mt-2 inline-flex min-h-11 items-center gap-1 text-base font-semibold text-blue-700 hover:underline">
                  {step.cta}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
