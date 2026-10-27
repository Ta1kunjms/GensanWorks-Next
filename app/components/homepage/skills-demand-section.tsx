"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Code, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { SkillDemandSupply } from "@/lib/labor-market";
import { Accent, CARD_DARK, CHART, CHART_TOOLTIP_STYLE, CONTAINER, DataUnavailable, SECTION_Y, SectionHeader, shortLabel } from "./landing-shared";

interface SkillsDemandSectionProps {
  skills?: SkillDemandSupply[];
  loading?: boolean;
  failed?: boolean;
}

// Top required skills on open job posts (demand = vacancies on posts that list the
// skill) against available supply (active, consented, job-seeking jobseekers who list
// it). Counts come from /api/public/labor-market; there are no fallback values.
export function SkillsDemandSection({ skills = [], loading = false, failed = false }: SkillsDemandSectionProps) {
  const chartHeight = Math.max(260, skills.length * 52);
  const summary =
    skills.length === 0
      ? "No skills are listed on open job posts yet."
      : `Top required skill: ${skills[0]?.skill}, ${formatCount(skills[0]?.demand)} vacancies against ${formatCount(skills[0]?.supply)} jobseekers who list it.`;

  return (
    <section aria-labelledby="skills-demand-heading" className={`relative w-full bg-white ${SECTION_Y}`}>
      <div className={CONTAINER}>
        <SectionHeader
          id="skills-demand-heading"
          eyebrow="Market Insights"
          icon={TrendingUp}
          title={<>Top Required Skills vs. <Accent>Available Supply</Accent></>}
          lead="What employers list on open job posts in General Santos, next to how many registered jobseekers list the same skill."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Dashboard Panel */}
          <figure className={`${CARD_DARK} relative min-w-0 overflow-hidden p-6 md:p-8`}>
            {/* Background Glows */}
            <div aria-hidden="true" className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

            <figcaption className="relative z-10 mb-8 flex items-start gap-4">
              <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                <Code className="h-5 w-5 text-blue-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-white">Skill Tracker</h3>
                <p className="mt-1 text-base text-slate-300">{loading || failed ? "From open job posts and jobseeker profiles" : summary}</p>
              </div>
            </figcaption>

            {loading ? (
              <div className="space-y-4 relative z-10" aria-hidden="true">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full bg-slate-800 rounded-full" />
                ))}
              </div>
            ) : failed ? (
              <DataUnavailable dark />
            ) : skills.length === 0 ? null : (
              <div className="relative z-10">
                <div aria-hidden="true" style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skills} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barGap={3} barCategoryGap="22%">
                      <CartesianGrid stroke={CHART.dark.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.dark.tick }} />
                      <YAxis
                        type="category"
                        dataKey="skill"
                        width={130}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 13, fill: CHART.dark.label }}
                        tickFormatter={(value: string) => shortLabel(value)}
                      />
                      <Tooltip
                        cursor={{ fill: CHART.dark.cursor }}
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number, name: string) => [formatCount(value), name]}
                      />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ color: CHART.dark.label, fontSize: 13, paddingTop: 12 }} />
                      <Bar dataKey="demand" name="Demand (vacancies)" fill={CHART.dark.primary} radius={[0, 6, 6, 0]} maxBarSize={18} />
                      <Bar dataKey="supply" name="Supply (jobseekers)" fill={CHART.dark.secondary} radius={[0, 6, 6, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <details className="mt-6 border-t border-white/10 pt-4 text-sm text-slate-200">
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-blue-300">Show data table</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left">
                      <caption className="sr-only">Top required skills: vacancies, job posts and jobseekers who list the skill</caption>
                      <thead>
                        <tr className="border-b border-white/20">
                          <th scope="col" className="py-2 pr-3 font-semibold">Skill</th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">Vacancies</th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">Job posts</th>
                          <th scope="col" className="py-2 text-right font-semibold">Jobseekers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skills.map((row) => (
                          <tr key={row.skill} className="border-b border-white/10">
                            <th scope="row" className="py-2 pr-3 font-medium text-white">{row.skill}</th>
                            <td className="py-2 pr-3 text-right tabular-nums">{formatCount(row.demand)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{formatCount(row.jobs)}</td>
                            <td className="py-2 text-right tabular-nums">{formatCount(row.supply)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </figure>

          {/* Training Programs CTA */}
          <div className="relative flex min-w-0 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-left shadow-sm md:p-8">
            <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10">
              <div aria-hidden="true" className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-balance text-2xl font-bold leading-tight text-white">
                Want to build these skills?
              </h3>
              <p className="mt-3 mb-8 text-base leading-relaxed text-blue-50">
                See the training programs listed on GensanWorks, or ask PESO General Santos about upcoming
                courses that match the skills employers are asking for.
              </p>
              <Link
                href="/training"
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-blue-700 transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700"
              >
                Browse Training Programs
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
