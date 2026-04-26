"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  RefreshCw,
  Users,
  Briefcase,
  FileText,
  UserPlus,
  Shield,
  Clock,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import {
  useAdminSummary,
  useAdminJobs,
  useAdminAnalytics,
  useAdminReferralsAnalytics,
  useUpdateJobStatus,
} from "@/hooks/use-admin";
import type { AdminJob } from "@/lib/dashboard-data";

const STATUS_OPTIONS: AdminJob["status"][] = [
  "draft",
  "pending",
  "active",
  "closed",
  "archived",
];

const REFERRAL_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
const STATUS_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#6b7280"];
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  active: "Active",
  closed: "Closed",
  archived: "Archived",
};

type AnalyticsPayload = {
  overview: {
    usersCount: number;
    employersCount: number;
    jobsCount: number;
    applicationsCount: number;
  };
  jobStatusCounts: Array<{ status: string; count: number }>;
  applicationStatusCounts: Array<{ status: string; count: number }>;
  monthlyTrends: Array<{ month: string; jobs: number; applications: number }>;
};

type ReferralsPayload = {
  totalReferrals: number;
  referralsByStatus: Array<{ status: string; count: number }>;
  topEmployers: Array<{
    employerId: string;
    employerName: string;
    count: number;
  }>;
};

export default function AdminDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState(new Date().toLocaleString());
  
  // TanStack Query Hooks
  const summaryQuery = useAdminSummary();
  const jobsQuery = useAdminJobs({ status: statusFilter, limit: 20 });
  const analyticsQuery = useAdminAnalytics();
  const referralsQuery = useAdminReferralsAnalytics();
  const updateJobStatusMutation = useUpdateJobStatus();

  const summary = summaryQuery.data;
  const jobs = jobsQuery.data?.data || [];
  const analytics = analyticsQuery.data;
  const referrals = referralsQuery.data;
  
  const loading = summaryQuery.isLoading || jobsQuery.isLoading;
  const isRefreshing = summaryQuery.isFetching || jobsQuery.isFetching;
  const error = summaryQuery.error || jobsQuery.error ? "Failed to load dashboard data" : "";

  const queryClient = useQueryClient();
  const handleRefresh = () => {
    summaryQuery.refetch();
    jobsQuery.refetch();
    analyticsQuery.refetch();
    referralsQuery.refetch();
    setLastUpdatedLabel(new Date().toLocaleString());
  };

  useEffect(() => {
    if (!isRefreshing) {
      setLastUpdatedLabel(new Date().toLocaleString());
    }
  }, [isRefreshing]);

  const statCards = useMemo(
    () => [
      {
        label: "Job Seekers",
        value: summary?.usersCount ?? 0,
        icon: Users,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
      },
      {
        label: "Employers",
        value: summary?.employersCount ?? 0,
        icon: Briefcase,
        color: "text-violet-600",
        bg: "bg-violet-50",
      },
      {
        label: "Jobs",
        value: summary?.jobsCount ?? 0,
        icon: FileText,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: "Applications",
        value: summary?.applicationsCount ?? 0,
        icon: UserPlus,
        color: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        label: "Pending Employers",
        value: summary?.pendingEmployerCount ?? 0,
        icon: Clock,
        color: "text-orange-600",
        bg: "bg-orange-50",
      },
      {
        label: "Pending Admin Requests",
        value: summary?.pendingAdminRequests ?? 0,
        icon: Shield,
        color: "text-rose-600",
        bg: "bg-rose-50",
      },
      {
        label: "Pending Jobs",
        value: summary?.pendingJobs ?? 0,
        icon: TrendingUp,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
    ],
    [summary],
  );

  const trendData = analytics?.monthlyTrends ?? [];
  const jobStatusData = analytics?.jobStatusCounts ?? [];
  const referralData = referrals?.referralsByStatus ?? [];
  const topEmployers = referrals?.topEmployers ?? [];
  const referralTotal = referrals?.totalReferrals ?? 0;

  const updateJobStatus = async (jobId: string, status: AdminJob["status"]) => {
    try {
      await updateJobStatusMutation.mutateAsync({ jobId, status });
    } catch (err: any) {
      // Error handling is managed by mutation but we can set a local error if needed
      console.error(err);
    }
  };

  function getStatusBadgeVariant(
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "draft":
        return "outline";
      case "closed":
        return "destructive";
      case "archived":
        return "secondary";
      default:
        return "outline";
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {/* Header Section */}
      <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">
            Last updated: {lastUpdatedLabel}
          </p>
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats Cards - Modern Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <p className="text-3xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Monthly Trends Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Monthly Trends
            </h3>
            <p className="text-sm text-slate-500">
              Job postings and applications over time.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
                <Line
                  type="monotone"
                  dataKey="jobs"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0f172a" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0ea5e9" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job Status Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Job Status Distribution
            </h3>
            <p className="text-sm text-slate-500">
              Current moderation state of all postings.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jobStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ status, percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {jobStatusData.map((entry: { status: string; count: number }, index: number) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Referral Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Referral Summary
            </h3>
            <p className="text-sm text-slate-500">
              Breakdown by referral status.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Total: {referralTotal}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {referralData.map((item: { status: string; count: number }, index: number) => (
            <div
              key={item.status}
              className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-slate-200 hover:bg-slate-100"
            >
              <div
                className="absolute bottom-0 left-0 h-1 w-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  backgroundColor:
                    REFERRAL_COLORS[index % REFERRAL_COLORS.length],
                }}
              />
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {item.status}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {item.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Employers */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Top Employers
          </h3>
          <p className="text-sm text-slate-500">
            By referral volume this period.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {topEmployers.length > 0 ? (
            topEmployers.map((item: { employerId: string; employerName: string; count: number }, index: number) => (
              <div
                key={item.employerId}
                className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-sm"
              >
                <div
                  className="absolute bottom-0 left-0 h-1 w-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    backgroundColor:
                      REFERRAL_COLORS[index % REFERRAL_COLORS.length],
                  }}
                />
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.employerName}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {item.count} referrals
                </p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-sm text-slate-500">
              No employer referral data available.
            </p>
          )}
        </div>
      </div>

      {/* Job Moderation Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Job Moderation
              </h3>
              <p className="text-sm text-slate-500">
                Review and update posting statuses.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="status-filter"
              >
                Filter:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] || status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className={`h-5 w-5 animate-spin mr-2`} />
            Loading...
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            No jobs found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Employer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                      {job.positionTitle}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {job.establishmentName || (
                        <span className="font-mono text-xs">
                          EMP:{job.employerId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 tabular-nums">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge
                        variant={getStatusBadgeVariant(job.status)}
                        className="text-xs"
                      >
                        {STATUS_LABELS[job.status] || job.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={
                              job.status === status ? "default" : "outline"
                            }
                            disabled={updateJobStatusMutation.isPending}
                            onClick={() => updateJobStatus(job.id, status)}
                            className="h-7 px-2 text-xs"
                          >
                            {STATUS_LABELS[status] || status}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobs.length > 10 && (
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
                Showing 10 of {jobs.length} jobs. Use filter to see more.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security & Account Section */}
      <div className="grid gap-6 xl:grid-cols-2">
        <AccountSecurityPanel />
        
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Account Actions
            </h3>
            <p className="text-sm text-slate-500">Manage your admin session</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/login/admin" })}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
