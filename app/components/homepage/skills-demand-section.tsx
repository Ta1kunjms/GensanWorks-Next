"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Code, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { SkillDemandSupply } from "@/lib/labor-market";
import { DataUnavailable } from "./landing-shared";

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
    <section aria-labelledby="skills-demand-heading" className="w-full py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            Market Insights
          </div>
          <h2 id="skills-demand-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Top Required Skills vs. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Available Supply</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            What employers list on open job posts in General Santos, next to how many registered jobseekers list the same skill.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Dashboard Panel */}
          <figure className="bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden border border-slate-800">
            {/* Background Glows */}
            <div aria-hidden="true" className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

            <figcaption className="flex items-center gap-4 mb-10 relative z-10">
              <div aria-hidden="true" className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
                <Code className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Skill Tracker</h3>
                <p className="text-slate-300 text-sm">{loading || failed ? "From open job posts and jobseeker profiles" : summary}</p>
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
                    <BarChart data={skills} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                      <YAxis type="category" dataKey="skill" width={150} tick={{ fontSize: 12, fill: "#e2e8f0" }} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        formatter={(value: number, name: string) => [formatCount(value), name]}
                      />
                      <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
                      <Bar dataKey="demand" name="Demand (vacancies)" fill="#60a5fa" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="supply" name="Supply (jobseekers)" fill="#34d399" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <details className="mt-6 text-sm text-slate-200">
                  <summary className="cursor-pointer font-semibold text-blue-300">Show data table</summary>
                  <table className="mt-3 w-full text-left">
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
                </details>
              </div>
            )}
          </figure>

          {/* Training Programs CTA */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-10 flex flex-col justify-center items-start text-left shadow-xl relative overflow-hidden border border-blue-500/50">
            <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10">
              <div aria-hidden="true" className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-6 shadow-inner">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                Want to build these skills?
              </h3>
              <p className="text-blue-50 text-base mb-8 leading-relaxed">
                See the training programs listed on GensanWorks, or ask PESO General Santos about upcoming
                courses that match the skills employers are asking for.
              </p>
              <Link
                href="/training"
                className="group inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-4 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300"
              >
                Browse Training Programs
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
