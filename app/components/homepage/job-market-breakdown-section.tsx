"use client";

import React from "react";
import { Laptop, MapPin, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { CityHiring, EmployerHiringNow, WorkArrangement } from "@/lib/labor-market";
import { Accent, AsOfNote, CARD, CARD_DARK, CONTAINER, DataUnavailable, SECTION_Y, SectionHeader } from "./landing-shared";

interface JobMarketBreakdownSectionProps {
  workArrangement?: WorkArrangement;
  cities?: CityHiring[];
  employersHiring?: EmployerHiringNow[];
  asOf?: string;
  loading?: boolean;
  failed?: boolean;
}

// Share bars use the same chart palette as the recharts panels: blue-600 and emerald-600.
function ShareBar({ value, total, color }: { value: number; total: number; color: string }) {
  const width = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function BreakdownList({ title, rows, color }: { title: string; rows: Array<{ key: string; label: string; jobs: number; vacancies: number }>; color: string }) {
  const total = rows.reduce((sum, row) => sum + row.jobs, 0);
  return (
    <div>
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h4>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3 text-sm">
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

function CardHeading({ icon: Icon, title, tone = "light", iconClass }: { icon: React.ElementType; title: string; tone?: "light" | "dark"; iconClass: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className={`text-xl font-semibold ${tone === "dark" ? "text-white" : "text-slate-900"}`}>{title}</h3>
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
    <section aria-labelledby="breakdown-heading" className={`relative w-full overflow-hidden bg-white ${SECTION_Y}`}>
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className={CONTAINER}>
        <SectionHeader
          id="breakdown-heading"
          eyebrow={<>Where &amp; How People Work</>}
          icon={MapPin}
          title={<>Jobs by Setup, <Accent>City &amp; Employer</Accent></>}
          lead="Open job posts by work arrangement, by the employer's city or municipality, and the employers with the most open vacancies."
        />

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : failed || !workArrangement ? (
          <DataUnavailable />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Work arrangement */}
            <div className={`${CARD} min-w-0 p-6 md:p-8`}>
              <CardHeading icon={Laptop} title="Jobs by work setup" iconClass="bg-blue-50 text-blue-700" />
              <div className="space-y-8">
                <BreakdownList title="Work setup" rows={workArrangement.setup} color="bg-blue-600" />
                <BreakdownList title="Work type" rows={workArrangement.type} color="bg-emerald-600" />
              </div>
            </div>

            {/* By city */}
            <div className={`${CARD} min-w-0 p-6 md:p-8`}>
              <CardHeading icon={MapPin} title="Hiring by city or municipality" iconClass="bg-emerald-50 text-emerald-700" />
              {cities.length === 0 ? (
                <p className="text-base text-slate-600">No open job posts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Open vacancies and job posts by employer city or municipality</caption>
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th scope="col" className="py-2 pr-3 font-semibold">City / municipality</th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">Vacancies</th>
                        <th scope="col" className="py-2 text-right font-semibold">Posts</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {cities.map((row) => (
                        <tr key={row.city} className="border-b border-slate-100">
                          <th scope="row" className="py-2.5 pr-3 font-medium text-slate-900">{row.city}</th>
                          <td className="py-2.5 pr-3 text-right font-bold text-slate-900 tabular-nums">{formatCount(row.vacancies)}</td>
                          <td className="py-2.5 text-right tabular-nums">{formatCount(row.jobs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Employers hiring now */}
            <div className={`${CARD_DARK} relative min-w-0 overflow-hidden p-6 md:p-8`}>
              <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <CardHeading icon={Building2} title="Employers hiring now" tone="dark" iconClass="border border-white/10 bg-white/10 text-blue-300" />
                {employersHiring.length === 0 ? (
                  <p className="text-base text-slate-300">No approved employer has open posts right now.</p>
                ) : (
                  <ol className="space-y-4">
                    {employersHiring.map((employer) => (
                      <li key={employer.name} className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{employer.name}</p>
                          <p className="truncate text-sm text-slate-300">
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
