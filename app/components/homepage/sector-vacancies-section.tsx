"use client";

import React from "react";
import { BarChart3, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { SectorSalary, SectorVacancies } from "@/lib/labor-market";
import { DataUnavailable, Figure } from "./landing-shared";

interface SectorVacanciesSectionProps {
  sectors?: SectorVacancies[];
  salaries?: SectorSalary[];
  loading?: boolean;
  failed?: boolean;
}

// Vacancy solicitation by SRS sector (open job posts) and the median monthly pay
// per sector. Charts are hidden from screen readers; the summary sentence and the
// data tables carry the same numbers.
export function SectorVacanciesSection({ sectors = [], salaries = [], loading = false, failed = false }: SectorVacanciesSectionProps) {
  const chartHeight = Math.max(220, sectors.length * 44);
  const top = sectors[0];
  const totalVacancies = sectors.reduce((sum, row) => sum + row.vacancies, 0);

  return (
    <section aria-labelledby="sector-heading" className="w-full bg-slate-50 py-32 relative overflow-hidden">
      <div aria-hidden="true" className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            Labour Market Insights
          </div>
          <h2 id="sector-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Vacancy Solicitation by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Sector</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Open vacancies on GensanWorks grouped by the standard SRS industry sectors employers select.
          </p>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8" aria-hidden="true">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        ) : failed ? (
          <DataUnavailable />
        ) : (
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
            {/* Vacancies by sector */}
            <figure className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
              <figcaption className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Open vacancies per sector</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {sectors.length === 0
                    ? "No open job posts yet."
                    : `${formatCount(totalVacancies)} open vacancies across ${sectors.length} ${sectors.length === 1 ? "sector" : "sectors"}; the most is ${top?.sector} with ${formatCount(top?.vacancies)}.`}
                </p>
              </figcaption>
              {sectors.length > 0 ? (
                <>
                  <div aria-hidden="true" style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectors} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                        <YAxis type="category" dataKey="sector" width={180} tick={{ fontSize: 12, fill: "#334155" }} />
                        <Tooltip formatter={(value: number) => [formatCount(value), "Vacancies"]} />
                        <Bar dataKey="vacancies" name="Vacancies" fill="#2563eb" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-6 text-sm">
                    <summary className="cursor-pointer font-semibold text-blue-700">Show data table</summary>
                    <table className="mt-3 w-full text-left">
                      <caption className="sr-only">Open job posts and vacancies by sector</caption>
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th scope="col" className="py-2 pr-3 font-semibold">Sector</th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">Job posts</th>
                          <th scope="col" className="py-2 text-right font-semibold">Vacancies</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectors.map((row) => (
                          <tr key={row.code} className="border-b border-slate-100">
                            <th scope="row" className="py-2 pr-3 font-medium text-slate-900">{row.sector}</th>
                            <td className="py-2 pr-3 text-right tabular-nums">{formatCount(row.jobs)}</td>
                            <td className="py-2 text-right tabular-nums">{formatCount(row.vacancies)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </>
              ) : null}
            </figure>

            {/* Salary by sector */}
            <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div aria-hidden="true" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-1">Salary range by sector</h3>
                <p className="text-sm text-white/90 mb-6">Median monthly pay offered on open posts with a salary.</p>
                {salaries.length === 0 ? (
                  <p className="text-sm font-medium">No salary data on open posts yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Median monthly pay and number of posts used, by sector</caption>
                    <thead>
                      <tr className="border-b border-white/30">
                        <th scope="col" className="py-2 pr-3 font-semibold">Sector</th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">Median / month</th>
                        <th scope="col" className="py-2 text-right font-semibold">
                          <abbr title="Number of job posts with a salary" className="no-underline">n</abbr>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((row) => (
                        <tr key={row.code} className="border-b border-white/15">
                          <th scope="row" className="py-2 pr-3 font-medium">{row.sector}</th>
                          <td className="py-2 pr-3 text-right tabular-nums font-bold">
                            <Figure value={row.n > 0 ? row.medianMonthly : null} kind="peso" />
                          </td>
                          <td className="py-2 text-right tabular-nums">{formatCount(row.n)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-6 text-xs text-white/90">
                  Midpoint of each post&apos;s salary range. Daily rates converted at 26 working days;
                  weekly at 52/12 weeks; hourly at 8 hours × 26 days. Posts without a salary are left out.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
