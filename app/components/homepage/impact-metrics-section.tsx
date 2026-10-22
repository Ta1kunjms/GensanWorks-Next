"use client";

import React from "react";
import { Users, Building2, Briefcase } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatGridSkeleton } from "@/components/ui/skeletons";
import { formatCount } from "@/lib/utils";

// Shape of /api/summary (app/api/summary/route.ts). The route also returns a
// period-over-period change, but it reports 100% whenever the previous period was 0,
// so that change is deliberately not displayed here.
interface SummaryData {
  totalApplicants?: { value?: number | null };
  activeEmployers?: { value?: number | null };
  successfulReferrals?: { value?: number | null };
}

interface ImpactMetricsSectionProps {
  summaryData?: SummaryData;
  isLoading?: boolean;
  /** When the summary was fetched (react-query dataUpdatedAt). */
  asOf?: number;
}

const formatAsOf = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

/** Real counts (including 0) are shown; missing or failed values render as "—" (never a substitute number). */
const shownCount = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export function ImpactMetricsSection({ summaryData, isLoading = false, asOf }: ImpactMetricsSectionProps) {
  // Labels describe exactly what each /api/summary count measures.
  const stats = [
    {
      label: "Registered jobseekers",
      value: shownCount(summaryData?.totalApplicants?.value),
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Approved employers",
      value: shownCount(summaryData?.activeEmployers?.value),
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      label: "Referrals marked hired",
      value: shownCount(summaryData?.successfulReferrals?.value),
      icon: <Briefcase className="h-5 w-5" />,
    },
  ];

  return (
    <section aria-labelledby="numbers-heading" className="w-full bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 id="numbers-heading" className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            GensanWorks in numbers
          </h2>
          <p className="mt-3 text-base text-slate-600">Totals recorded on the platform. A dash means the figure is not available.</p>
          <p className="mt-2 text-sm text-slate-600">
            {asOf ? `Demo data · as of ${formatAsOf(asOf)}` : "Demo data"}
          </p>
        </div>

        {isLoading ? (
          <StatGridSkeleton count={3} className="lg:grid-cols-3" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={formatCount(stat.value)} icon={stat.icon} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
