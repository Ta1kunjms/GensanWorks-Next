"use client";

import React from "react";
import { BarChart3, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { SectorSalary, SectorVacancies } from "@/lib/labor-market";
import { Accent, CARD, CHART, CHART_TOOLTIP_STYLE, CONTAINER, DataUnavailable, Figure, SECTION_Y, SectionHeader, shortLabel } from "./landing-shared";

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
    <section aria-labelledby="sector-heading" className={`relative w-full overflow-hidden bg-slate-50 ${SECTION_Y}`}>
      <div aria-hidden="true" className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className={CONTAINER}>
        <SectionHeader
          id="sector-heading"
          eyebrow="Labour Market Insights"
          icon={BarChart3}
          title={<>Vacancy Solicitation by <Accent>Sector</Accent></>}
          lead="Open vacancies on GensanWorks grouped by the standard SRS industry sectors employers select."
        />

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" aria-hidden="true">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        ) : failed ? (
          <DataUnavailable />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Vacancies by sector */}
            <figure className={`${CARD} min-w-0 p-6 md:p-8`}>
              <figcaption className="mb-6">
                <h3 className="text-xl font-semibold text-slate-900">Open vacancies per sector</h3>
                <p className="mt-1 text-base text-slate-600">
                  {sectors.length === 0
                    ? "No open job posts yet."
                    : `${formatCount(totalVacancies)} open vacancies across ${sectors.length} ${sectors.length === 1 ? "sector" : "sectors"}; the most is ${top?.sector} with ${formatCount(top?.vacancies)}.`}
                </p>
              </figcaption>
              {sectors.length > 0 ? (
                <>
                  <div aria-hidden="true" style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectors} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="25%">
                        <CartesianGrid stroke={CHART.light.grid} horizontal={false} />
                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART.light.tick }} />
                        <YAxis
                          type="category"
                          dataKey="sector"
                          width={150}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 13, fill: CHART.light.label }}
                          tickFormatter={(value: string) => shortLabel(value)}
                        />
                        <Tooltip
                          cursor={{ fill: CHART.light.cursor }}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value: number) => [formatCount(value), "Vacancies"]}
                        />
                        <Bar dataKey="vacancies" name="Vacancies" fill={CHART.light.primary} radius={[0, 6, 6, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-6 border-t border-slate-100 pt-4 text-sm">
                    <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-blue-700">Show data table</summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left">
                        <caption className="sr-only">Open job posts and vacancies by sector</caption>
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600">
                            <th scope="col" className="py-2 pr-3 font-semibold">Sector</th>
                            <th scope="col" className="py-2 pr-3 text-right font-semibold">Job posts</th>
                            <th scope="col" className="py-2 text-right font-semibold">Vacancies</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {sectors.map((row) => (
                            <tr key={row.code} className="border-b border-slate-100">
                              <th scope="row" className="py-2 pr-3 font-medium text-slate-900">{row.sector}</th>
                              <td className="py-2 pr-3 text-right tabular-nums">{formatCount(row.jobs)}</td>
                              <td className="py-2 text-right tabular-nums">{formatCount(row.vacancies)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              ) : null}
            </figure>

            {/* Salary by sector */}
            <div className="relative min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 p-6 text-white shadow-sm md:p-8">
              <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div aria-hidden="true" className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Salary range by sector</h3>
                <p className="mt-1 mb-6 text-base text-emerald-50">Median monthly pay offered on open posts with a salary.</p>
                {salaries.length === 0 ? (
                  <p className="text-base font-medium">No salary data on open posts yet.</p>
                ) : (
                  <div className="overflow-x-auto">
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
                  </div>
                )}
                <p className="mt-6 text-xs leading-relaxed text-emerald-50">
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
