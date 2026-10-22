"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { AlertTriangle, Clock3, DatabaseBackup, RefreshCw, ShieldAlert, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardData, ApiIntegrationHealthItem } from "../_lib/types";
import type { DashboardPeriod } from "../_lib/types-period";
import {
  formatNumber,
  formatPercent,
  formatTimeOnly,
  formatTimestamp,
  integrationStatusBadgeClass,
  periodNoun,
  referralStatusBadgeClass,
  securityAlertBadgeClass,
  trendTitle,
} from "../_lib/formatters";
import { KpiCard } from "./kpi-card";
import { ActionQueueCard } from "./action-queue-card";
import { ChartCard } from "./chart-card";
import { RankingListCard } from "./ranking-list-card";
import { MiniTable } from "./mini-table";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";

const JOB_STATUS_COLORS = ["#f59e0b", "#0ea5e9", "#ef4444", "#64748b", "#10b981"];

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

function integrationStatusLabel(item: ApiIntegrationHealthItem): string {
  if (item.status === "healthy") return "Healthy";
  if (item.status === "degraded") return "Degraded";
  return "Offline";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-10 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-16 rounded-lg bg-slate-100" />
      <div className="space-y-3">
        <div className="h-5 w-32 rounded bg-slate-100" />
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-lg border border-slate-200 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-50" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-36 rounded bg-slate-100" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="h-72 rounded-lg bg-slate-100" />
    </div>
  );
}

export function AdminDashboardClient() {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchData = useCallback(async (selectedPeriod: DashboardPeriod, isManualSync = false) => {
    if (isManualSync) setSyncing(true);
    else setLoading(true);
    // error is cleared only on success so ErrorState stays mounted while retrying.
    try {
      const res = await fetch(`/api/admin/dashboard/summary?period=${selectedPeriod}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // After a successful Retry, focus moves to the page heading (the Retry button is gone).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterRetryRef = useRef(false);
  useEffect(() => {
    if (!loading && !error && focusAfterRetryRef.current) {
      focusAfterRetryRef.current = false;
      headingRef.current?.focus();
    }
  }, [loading, error]);

  const handlePeriodSelect = (value: DashboardPeriod) => {
    setDropdownOpen(false);
    if (value !== period) setPeriod(value);
  };

  const selectedPeriodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "Month";

  // KPI pairs: [left, right] per row — ordered to match mockup
  const kpiPairs: Array<[string, string]> = [
    ["jobseekers", "applications"],
    ["employers", "referrals"],
    ["vacancies", "success_rate"],
  ];

  return (
    <main className="space-y-8 pb-10" aria-labelledby="admin-dashboard-heading">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 id="admin-dashboard-heading" ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-slate-900 outline-none">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            PESO-General Santos City command center for moderation, referrals, labor market monitoring, and system oversight.
          </p>
          {lastSync && (
            <p className="text-xs text-slate-500">Last sync: {formatTimestamp(lastSync.toISOString())}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Period dropdown */}
          <div className="relative">
            <Button
              id="period-dropdown-trigger"
              variant="outline"
              className="flex items-center gap-1.5 font-medium"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              {selectedPeriodLabel}
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </Button>
            {dropdownOpen && (
              <ul
                role="listbox"
                aria-label="Select period"
                className="absolute right-0 z-50 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === period}
                    onClick={() => handlePeriodSelect(opt.value)}
                    className={`cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-slate-50 ${
                      opt.value === period ? "font-semibold text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sync Now */}
          <Button
            id="sync-now-button"
            className="bg-slate-900 hover:bg-slate-700 text-white"
            onClick={() => fetchData(period, true)}
            disabled={syncing || loading}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      </header>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setDropdownOpen(false)}
        />
      )}

      {loading && !error && <DashboardSkeleton />}

      {/* Fixed copy only: the backend error text is not shown to users. */}
      {error && (
        <ErrorState
          title="Failed to load dashboard"
          message="The dashboard data could not be loaded. Check your connection and try again."
          onRetry={() => {
            focusAfterRetryRef.current = true;
            void fetchData(period);
          }}
          retrying={loading}
        />
      )}

      {data && !loading && (
        <>
          {/* ── KPI Overview ───────────────────────────────────────── */}
          <section aria-labelledby="kpi-overview-heading" className="space-y-3">
            <h2 id="kpi-overview-heading" className="text-lg font-semibold text-slate-900">
              KPI Overview
            </h2>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              {kpiPairs.map(([leftId, rightId], rowIndex) => {
                const left = data.kpis.find((k) => k.id === leftId);
                const right = data.kpis.find((k) => k.id === rightId);
                return (
                  <div
                    key={leftId}
                    className={`grid grid-cols-2 divide-x divide-slate-200 ${
                      rowIndex > 0 ? "border-t border-slate-200" : ""
                    }`}
                  >
                    {left && (
                      <KpiCard
                        label={left.label}
                        value={left.id === "success_rate" ? formatPercent(left.value) : formatNumber(left.value)}
                        trendLabel={left.trendLabel}
                      />
                    )}
                    {right && (
                      <KpiCard
                        label={right.label}
                        value={right.id === "success_rate" ? formatPercent(right.value) : formatNumber(right.value)}
                        trendLabel={right.trendLabel}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Action Required ─────────────────────────────────────── */}
          <section aria-labelledby="action-required-heading" className="space-y-3">
            <h2 id="action-required-heading" className="text-lg font-semibold text-slate-900">
              Action Required
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {data.actionRequired.map((item) => (
                <ActionQueueCard
                  key={item.id}
                  title={item.title}
                  count={item.count}
                  ctaLabel={item.ctaLabel}
                  ctaHref={item.ctaHref}
                />
              ))}
            </div>
          </section>

          {/* ── Labor Market Intelligence ────────────────────────────── */}
          <section aria-labelledby="lmi-heading" className="space-y-4">
            <h2 id="lmi-heading" className="text-lg font-semibold text-slate-900">
              Labor Market Intelligence
            </h2>

            {/* Full-width trend chart */}
            <ChartCard
              title={trendTitle(period)}
              description={
                period === "day"
                  ? "Hourly activity for today."
                  : period === "week"
                    ? "Daily activity for this week."
                    : period === "month"
                      ? "Daily activity for this month."
                      : period === "quarter"
                        ? "Monthly activity for this quarter."
                        : period === "year"
                          ? "Monthly activity for this year."
                          : "Recent monthly activity across the full history."
              }
            >
              {(() => {
                const points = data.lmi.trend;
                const total = points.reduce(
                  (acc, p) =>
                    acc + p.registrations + p.applications + p.referrals + p.placements,
                  0,
                );
                if (total === 0) {
                  return (
                    <EmptyState
                      title={`No platform activity ${periodNoun(period)}`}
                      description="Once registrations, applications, referrals, or placements start flowing, they will appear here."
                    />
                  );
                }
                return (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={points} margin={{ left: -12, right: 12, top: 12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="registrations" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="applications" stroke="#0891b2" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="referrals" stroke="#d97706" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="placements" stroke="#16a34a" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </ChartCard>

            {/* 2-column charts row */}
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Job status changes"
                description={`Jobs that entered each status ${periodNoun(period)}.`}
              >
                {data.lmi.jobStatusDistribution.every((item) => item.count === 0) ? (
                  <EmptyState
                    title={`No job status activity ${periodNoun(period)}`}
                    description="Once jobs move through approval, rejection, archival, or closure, they will appear here."
                  />
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.lmi.jobStatusDistribution}
                          dataKey="count"
                          nameKey="status"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {data.lmi.jobStatusDistribution.map((item, index) => (
                            <Cell key={item.status} fill={JOB_STATUS_COLORS[index % JOB_STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Sector demand"
                description={`Vacancy volume by sector from approved postings ${periodNoun(period)}.`}
              >
                {data.lmi.sectorDemand.length === 0 ? (
                  <EmptyState
                    title={`No sector demand ${periodNoun(period)}`}
                    description="Once approved jobs are created, their sector demand will appear here."
                  />
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.lmi.sectorDemand} margin={{ left: -10, right: 12, top: 10, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="sector" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="vacancies" fill="#0f766e" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Full-width top skills */}
            <RankingListCard
              title="Top in-demand skills"
              items={data.lmi.topSkills.length === 0 ? [] : data.lmi.topSkills.map((item, index) => ({
                id: `${item.skill}-${index}`,
                label: item.skill,
                value: item.count,
                sublabel: `Matches from postings and jobseeker profiles ${periodNoun(period)}`,
              }))}
            />
          </section>

          {/* ── Rankings and Hotspot ─────────────────────────────────── */}
          <section aria-labelledby="rankings-hotspots-heading" className="space-y-3">
            <h2 id="rankings-hotspots-heading" className="text-lg font-semibold text-slate-900">
              Rankings and Hotspot
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <RankingListCard title="Top employers by referral volume" items={data.rankings.topEmployersByReferrals} />
              <RankingListCard title="Top employers by active vacancies" items={data.rankings.topEmployersByVacancies} />
              <RankingListCard title="Top barangays by placement" items={data.rankings.topBarangayHotspots} />
              <RankingListCard title="Top sectors by hiring/placement" items={data.rankings.topSectorsByPlacement} />
            </div>
          </section>

          {/* ── Referral & Placement Monitoring ─────────────────────── */}
          <section aria-labelledby="referral-monitoring-heading" className="space-y-3">
            <h2 id="referral-monitoring-heading" className="text-lg font-semibold text-slate-900">
              Referral and Placement Monitoring
            </h2>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-slate-200 lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900">Referral status summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {data.referralMonitoring.statusSummary.map((item) => (
                      <div key={item.status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <StatusBadge label={item.status} className={referralStatusBadgeClass(item.status)} />
                        <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(item.count)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900">Placement tracking summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total placements</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(data.referralMonitoring.placementSummary.totalPlacements)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Placement rate</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatPercent(data.referralMonitoring.placementSummary.placementRate)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pending placement validations</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(data.referralMonitoring.placementSummary.pendingPlacements)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Employer feedback completion</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatPercent(data.referralMonitoring.employerFeedback.completionRate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatNumber(data.referralMonitoring.employerFeedback.completed)} completed,{" "}
                      {formatNumber(data.referralMonitoring.employerFeedback.pending)} pending
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <MiniTable
              title={`Recent referrals ${periodNoun(period)}`}
              rows={data.referralMonitoring.recentReferrals}
              rowKey={(row) => row.id}
              emptyLabel={`No referrals ${periodNoun(period)}.`}
              columns={[
                { header: "Slip #", render: (row) => <span className="font-mono text-xs">{row.slipNumber}</span> },
                { header: "Job Seeker", render: (row) => row.jobseekerName },
                { header: "Employer", render: (row) => row.employerName },
                { header: "Job", render: (row) => row.jobTitle },
                {
                  header: "Status",
                  render: (row) => <StatusBadge label={row.status} className={referralStatusBadgeClass(row.status)} />,
                },
                { header: "Referred At", render: (row) => formatTimestamp(row.referredAt) },
              ]}
            />
          </section>

          {/* ── System Oversight ─────────────────────────────────────── */}
          <section aria-labelledby="system-oversight-heading" className="space-y-3">
            <h2 id="system-oversight-heading" className="text-lg font-semibold text-slate-900">
              System Oversight
            </h2>

            <div className="grid gap-4 xl:grid-cols-3">
              <MiniTable
                title={`Recent activity ${periodNoun(period)}`}
                rows={data.systemOversight.activityLog}
                rowKey={(row) => row.id}
                emptyLabel={`No activity logs ${periodNoun(period)}.`}
                columns={[
                  { header: "Time", render: (row) => formatTimeOnly(row.occurredAt) },
                  { header: "Actor", render: (row) => row.actor },
                  { header: "Action", render: (row) => row.action },
                  { header: "Module", render: (row) => row.module },
                ]}
              />

              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900">Error report summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs text-slate-500">
                    Open issues {periodNoun(period)}
                  </p>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-rose-700">Open critical</p>
                    <p className="mt-1 text-2xl font-bold text-rose-900">
                      {data.systemOversight.errorSummary.openCritical}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-700">Open warnings</p>
                    <p className="mt-1 text-2xl font-bold text-amber-900">
                      {data.systemOversight.errorSummary.openWarnings}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last incident {periodNoun(period)}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {data.systemOversight.errorSummary.lastIncidentAt
                        ? formatTimestamp(data.systemOversight.errorSummary.lastIncidentAt)
                        : "No incidents recorded"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900">Infrastructure status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="inline-flex items-center gap-2 text-slate-700">
                      <DatabaseBackup className="h-4 w-4" />
                      Latest backup
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {data.systemOversight.latestBackupAt
                        ? formatTimestamp(data.systemOversight.latestBackupAt)
                        : "Managed by Supabase (not tracked)"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {data.systemOversight.apiHealth.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.latencyMs} ms</p>
                        </div>
                        <StatusBadge
                          label={integrationStatusLabel(item)}
                          className={integrationStatusBadgeClass(item.status)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">Security and audit alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {data.systemOversight.securityAlerts.length === 0 ? (
                  <EmptyState
                    title="No active alerts"
                    description="Security and audit checks are currently clear."
                  />
                ) : (
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {data.systemOversight.securityAlerts.map((alert) => (
                      <li key={alert.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <StatusBadge
                          label={alert.level.toUpperCase()}
                          className={securityAlertBadgeClass(alert.level)}
                          icon={
                            alert.level === "critical" ? (
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : alert.level === "warning" ? (
                              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            )
                          }
                        />
                        <p className="mt-2 text-sm text-slate-700">{alert.label}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}
