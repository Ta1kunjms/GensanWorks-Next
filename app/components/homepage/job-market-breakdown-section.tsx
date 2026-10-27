"use client";

import React from "react";
import { Laptop, MapPin, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { CityHiring, EmployerHiringNow, WorkArrangement } from "@/lib/labor-market";
import { AsOfNote, DataUnavailable } from "./landing-shared";

interface JobMarketBreakdownSectionProps {
  workArrangement?: WorkArrangement;
  cities?: CityHiring[];
  employersHiring?: EmployerHiringNow[];
  asOf?: string;
  loading?: boolean;
  failed?: boolean;
}

function ShareBar({ value, total, color }: { value: number; total: number; color: string }) {
  const width = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div aria-hidden="true" className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function BreakdownList({ title, rows, color }: { title: string; rows: Array<{ key: string; label: string; jobs: number; vacancies: number }>; color: string }) {
  const total = rows.reduce((sum, row) => sum + row.jobs, 0);
  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">{title}</h4>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex justify-between items-end mb-2 text-sm">
              <span className="font-semibold text-slate-900">{row.label}</span>
              <span className="text-slate-600 tabular-nums">
                {formatCount(row.jobs)} {row.jobs === 1 ? "post" : "posts"} · {formatCount(row.vacancies)} {row.vacancies === 1 ? "vacancy" : "vacancies"}
              </span>
            </div>
            <ShareBar value={row.jobs} total={total} color={color} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Work setup / work type, hiring by employer city, and employers with the most open
// vacancies. All values are counts over open job posts from /api/public/labor-market.
export function JobMarketBreakdownSection({
  workArrangement,
  cities = [],
  employersHiring = [],
  asOf,
  loading = false,
  failed = false,
}: JobMarketBreakdownSectionProps) {
  return (
    <section aria-labelledby="breakdown-heading" className="w-full bg-white py-32 relative overflow-hidden">
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Where &amp; How People Work
          </div>
          <h2 id="breakdown-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Jobs by Setup, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">City &amp; Employer</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Open job posts by work arrangement, by the employer&apos;s city or municipality, and the employers with the most open vacancies.
          </p>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-3 gap-8" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </div>
        ) : failed || !workArrangement ? (
          <DataUnavailable />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Work arrangement */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 space-y-8">
              <div className="flex items-center gap-3">
                <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-500/20">
                  <Laptop className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Jobs by work setup</h3>
              </div>
              <BreakdownList title="Work setup" rows={workArrangement.setup} color="from-blue-400 to-blue-600" />
              <BreakdownList title="Work type" rows={workArrangement.type} color="from-purple-400 to-purple-600" />
            </div>

            {/* By city */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-3 mb-8">
                <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/20">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Hiring by city or municipality</h3>
              </div>
              {cities.length === 0 ? (
                <p className="text-sm text-slate-600">No open job posts yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Open vacancies and job posts by employer city or municipality</caption>
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th scope="col" className="py-2 pr-3 font-semibold">City / municipality</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Vacancies</th>
                      <th scope="col" className="py-2 text-right font-semibold">Posts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.map((row) => (
                      <tr key={row.city} className="border-b border-slate-100">
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-900">{row.city}</th>
                        <td className="py-2 pr-3 text-right tabular-nums font-bold">{formatCount(row.vacancies)}</td>
                        <td className="py-2 text-right tabular-nums">{formatCount(row.jobs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Employers hiring now */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div aria-hidden="true" className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                    <Building2 className="w-6 h-6 text-blue-300" />
                  </div>
                  <h3 className="text-xl font-bold">Employers hiring now</h3>
                </div>
                {employersHiring.length === 0 ? (
                  <p className="text-sm text-slate-300">No approved employer has open posts right now.</p>
                ) : (
                  <ol className="space-y-4">
                    {employersHiring.map((employer) => (
                      <li key={employer.name} className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{employer.name}</p>
                          <p className="text-xs text-slate-300 truncate">
                            {[employer.industry, employer.city].filter(Boolean).join(" · ") || "Details not listed"}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm tabular-nums">
                          <span className="block font-bold text-white">{formatCount(employer.openVacancies)} vacancies</span>
                          <span className="block text-xs text-slate-300">{formatCount(employer.openJobs)} {employer.openJobs === 1 ? "post" : "posts"}</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}

        <AsOfNote asOf={asOf} className="mt-10 text-center" />
      </div>
    </section>
  );
}
