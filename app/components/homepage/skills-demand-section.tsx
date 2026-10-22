"use client";

import React from "react";
import { LoadingRegion } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

interface SkillsData {
  skill: string;
  percentage: number;
}

interface SkillsDemandSectionProps {
  /** Rows from /api/landing/skills only; no client-side fallback values. */
  skillsData?: SkillsData[];
  loading?: boolean;
  /** When the data was fetched (react-query dataUpdatedAt). */
  asOf?: number;
}

const formatAsOf = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

// Labour-market snapshot. Renders nothing when the API returns no rows. The values
// are synthetic while the pilot runs on demo data, so they are labelled as such.
export function SkillsDemandSection({ skillsData, loading = false, asOf }: SkillsDemandSectionProps) {
  const rows = (skillsData ?? []).filter((row) => row && row.skill && Number.isFinite(row.percentage));

  if (!loading && rows.length === 0) return null;

  return (
    <section aria-labelledby="snapshot-heading" className="w-full bg-slate-50 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 id="snapshot-heading" className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Labour-market snapshot
          </h2>
          <p className="mt-3 text-base text-slate-600">Skills in demand, shown as a 0–100 demand index.</p>
          <p className="mt-2 text-sm text-slate-600">
            {asOf ? `Demo data · as of ${formatAsOf(asOf)}` : "Demo data"}. Illustrative values, not official labour-market
            statistics.
          </p>
        </div>

        {loading ? (
          <LoadingRegion className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-2 w-full" />
              </div>
            ))}
          </LoadingRegion>
        ) : (
          <ul className="grid gap-x-10 gap-y-6 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
            {rows.map((row) => {
              const percent = clampPercent(row.percentage);
              return (
                <li key={row.skill}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-900">{row.skill}</span>
                    <span className="tabular-nums text-slate-600">
                      <span className="sr-only">Demand index </span>
                      {percent}
                      <span className="sr-only"> out of 100</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
