"use client";

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
import { AlertTriangle, Clock3, DatabaseBackup, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardData, ApiIntegrationHealthItem } from "../_lib/types";
import {
  formatNumber,
  formatPercent,
  formatTimeOnly,
  formatTimestamp,
  integrationStatusBadgeClass,
  queuePriorityBadgeClass,
  referralStatusBadgeClass,
  securityAlertBadgeClass,
} from "../_lib/formatters";
import { KpiCard } from "./kpi-card";
import { ActionQueueCard } from "./action-queue-card";
import { ChartCard } from "./chart-card";
import { RankingListCard } from "./ranking-list-card";
import { MiniTable } from "./mini-table";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";

const JOB_STATUS_COLORS = ["#f59e0b", "#0ea5e9", "#ef4444", "#64748b", "#10b981"];

type AdminDashboardClientProps = {
  dashboardData: AdminDashboardData;
};

function integrationStatusLabel(item: ApiIntegrationHealthItem): string {
  if (item.status === "healthy") return "Healthy";
  if (item.status === "degraded") return "Degraded";
  return "Offline";
}

export function AdminDashboardClient({ dashboardData }: AdminDashboardClientProps) {
  return (
    <main className="space-y-8 pb-10" aria-labelledby="admin-dashboard-heading">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 id="admin-dashboard-heading" className="text-3xl font-bold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            PESO-General Santos City command center for moderation, referrals, labor market monitoring, and system oversight.
          </p>
          <p className="text-xs text-slate-500">Last sync: {formatTimestamp(dashboardData.generatedAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/employer-approvals">Review Employers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/jobs">Moderate Jobs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/referrals">Generate Referral</Link>
          </Button>
          <Button asChild className="bg-slate-900 hover:bg-slate-800">
            <Link href="/admin/matching">Run AI Match</Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="kpi-overview-heading" className="space-y-3">
        <h2 id="kpi-overview-heading" className="text-lg font-semibold text-slate-900">
          KPI Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {dashboardData.kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.id === "success_rate" ? formatPercent(kpi.value) : formatNumber(kpi.value)}
              trendLabel={kpi.trendLabel}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="action-required-heading" className="space-y-3">
        <h2 id="action-required-heading" className="text-lg font-semibold text-slate-900">
          Action Required
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {dashboardData.actionRequired.map((item) => (
            <ActionQueueCard
              key={item.id}
              title={item.title}
              count={item.count}
              ctaLabel={item.ctaLabel}
              ctaHref={item.ctaHref}
              priorityLabel={item.priority.toUpperCase()}
              priorityClassName={queuePriorityBadgeClass(item.priority)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="lmi-heading" className="space-y-3">
        <h2 id="lmi-heading" className="text-lg font-semibold text-slate-900">
          Labor Market Intelligence
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Monthly trend"
            description="Platform-derived trend of registrations, applications, referrals, and placements."
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.lmi.monthlyTrends} margin={{ left: -12, right: 12, top: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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
          </ChartCard>

          <ChartCard title="Job status distribution" description="Current moderation and lifecycle status of job postings.">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.lmi.jobStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {dashboardData.lmi.jobStatusDistribution.map((item, index) => (
                      <Cell key={item.status} fill={JOB_STATUS_COLORS[index % JOB_STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Sector demand" description="Vacancy volume by sector from approved and active postings.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.lmi.sectorDemand} margin={{ left: -10, right: 12, top: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sector" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="vacancies" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <RankingListCard
            title="Top in-demand skills"
            items={dashboardData.lmi.topSkills.map((item, index) => ({
              id: `${item.skill}-${index}`,
              label: item.skill,
              value: item.count,
              sublabel: "Job seeker profile matches",
            }))}
          />
        </div>
      </section>

      <section aria-labelledby="rankings-hotspots-heading" className="space-y-3">
        <h2 id="rankings-hotspots-heading" className="text-lg font-semibold text-slate-900">
          Rankings and Hotspot
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RankingListCard title="Top employers by referral volume" items={dashboardData.rankings.topEmployersByReferrals} />
          <RankingListCard title="Top employers by active vacancies" items={dashboardData.rankings.topEmployersByVacancies} />
          <RankingListCard title="Top barangays by placement" items={dashboardData.rankings.topBarangayHotspots} />
          <RankingListCard title="Top sectors by hiring/placement" items={dashboardData.rankings.topSectorsByPlacement} />
        </div>
      </section>

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
                {dashboardData.referralMonitoring.statusSummary.map((item) => (
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
                <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboardData.referralMonitoring.placementSummary.totalPlacements)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Placement rate</p>
                <p className="text-2xl font-bold text-slate-900">{formatPercent(dashboardData.referralMonitoring.placementSummary.placementRate)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Pending placement validations</p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboardData.referralMonitoring.placementSummary.pendingPlacements)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Employer feedback completion</p>
                <p className="text-2xl font-bold text-slate-900">{formatPercent(dashboardData.referralMonitoring.employerFeedback.completionRate)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatNumber(dashboardData.referralMonitoring.employerFeedback.completed)} completed, {formatNumber(dashboardData.referralMonitoring.employerFeedback.pending)} pending
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <MiniTable
          title="Recent referrals"
          rows={dashboardData.referralMonitoring.recentReferrals}
          rowKey={(row) => row.id}
          emptyLabel="No recent referrals available."
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

      <section aria-labelledby="system-oversight-heading" className="space-y-3">
        <h2 id="system-oversight-heading" className="text-lg font-semibold text-slate-900">
          System Oversight
        </h2>

        <div className="grid gap-4 xl:grid-cols-3">
          <MiniTable
            title="Recent activity log"
            rows={dashboardData.systemOversight.activityLog}
            rowKey={(row) => row.id}
            emptyLabel="No activity logs available."
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
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs uppercase tracking-wide text-rose-700">Open critical</p>
                <p className="mt-1 text-2xl font-bold text-rose-900">{dashboardData.systemOversight.errorSummary.openCritical}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-700">Open warnings</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">{dashboardData.systemOversight.errorSummary.openWarnings}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Last incident</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {dashboardData.systemOversight.errorSummary.lastIncidentAt
                    ? formatTimestamp(dashboardData.systemOversight.errorSummary.lastIncidentAt)
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
                <p className="mt-1 font-medium text-slate-900">{formatTimestamp(dashboardData.systemOversight.latestBackupAt)}</p>
              </div>

              <div className="space-y-2">
                {dashboardData.systemOversight.apiHealth.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.latencyMs} ms</p>
                    </div>
                    <StatusBadge label={integrationStatusLabel(item)} className={integrationStatusBadgeClass(item.status)} />
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
            {dashboardData.systemOversight.securityAlerts.length === 0 ? (
              <EmptyState
                title="No active alerts"
                description="Security and audit checks are currently clear."
              />
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {dashboardData.systemOversight.securityAlerts.map((alert) => (
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
    </main>
  );
}
