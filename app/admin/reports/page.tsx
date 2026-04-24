"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

type TimelinePayload = {
  months: number;
  monthlyTrends: Array<{ month: string; jobs: number; applications: number }>;
};

type ReferralsPayload = {
  totalReferrals: number;
  referralsByStatus: Array<{ status: string; count: number }>;
  topEmployers: Array<{ employerId: string; employerName: string; count: number }>;
};

type AuditFeedPayload = {
  totalEvents: number;
  events: Array<{
    timestamp: string;
    type: string;
    actor: string;
    detail: string;
  }>;
};

type RealtimeMetricsPayload = {
  generatedAt: string;
  lastUpdatedAt: string;
  counters: {
    messages_stream_connections: number;
    messages_stream_active: number;
    messages_stream_errors: number;
    messages_stream_emits: number;
    notifications_stream_connections: number;
    notifications_stream_active: number;
    notifications_stream_errors: number;
    notifications_stream_emits: number;
    messages_send_success: number;
    messages_send_failure: number;
    messages_read_updates: number;
  };
};

const COLORS = ["#0f766e", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e", "#6b7280"];

export default function AdminReportsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [timeline, setTimeline] = useState<TimelinePayload | null>(null);
  const [referrals, setReferrals] = useState<ReferralsPayload | null>(null);
  const [auditFeed, setAuditFeed] = useState<AuditFeedPayload | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<"csv" | "excel" | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [analyticsRes, timelineRes, referralsRes, auditRes, realtimeRes] = await Promise.all([
          fetch("/api/admin/analytics", { cache: "no-store" }),
          fetch("/api/admin/analytics/timeline?months=6", { cache: "no-store" }),
          fetch("/api/admin/analytics/referrals", { cache: "no-store" }),
          fetch("/api/admin/analytics/audit-feed?limit=8", { cache: "no-store" }),
          fetch("/api/admin/realtime-metrics", { cache: "no-store" }),
        ]);

        if (!analyticsRes.ok) {
          setError("Unable to load reports");
          setData(null);
          return;
        }

        const payload = (await analyticsRes.json()) as AnalyticsPayload;
        setData(payload);

        if (timelineRes.ok) {
          const timelinePayload = (await timelineRes.json()) as TimelinePayload;
          setTimeline(timelinePayload);
        }

        if (referralsRes.ok) {
          const referralsPayload = (await referralsRes.json()) as ReferralsPayload;
          setReferrals(referralsPayload);
        }

        if (auditRes.ok) {
          const auditPayload = (await auditRes.json()) as AuditFeedPayload;
          setAuditFeed(auditPayload);
        }

        if (realtimeRes.ok) {
          const realtimePayload = (await realtimeRes.json()) as RealtimeMetricsPayload;
          setRealtimeMetrics(realtimePayload);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const overviewCards = useMemo(
    () => [
      { label: "Job Seekers", value: data?.overview.usersCount ?? 0 },
      { label: "Employers", value: data?.overview.employersCount ?? 0 },
      { label: "Jobs", value: data?.overview.jobsCount ?? 0 },
      { label: "Applications", value: data?.overview.applicationsCount ?? 0 },
    ],
    [data]
  );

  const trendData = timeline?.monthlyTrends ?? data?.monthlyTrends ?? [];

  const downloadReports = async (format: "csv" | "excel") => {
    setDownloadingFormat(format);
    try {
      const res = await fetch(`/api/admin/analytics/export?format=${format}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to export reports");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const datePart = new Date().toISOString().slice(0, 10);

      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
      const fallbackExtension = format === "excel" ? "xls" : "csv";

      anchor.href = url;
      anchor.download = filenameMatch?.[1]?.trim()?.replace(/^\"|\"$/g, "") || `admin-reports-${datePart}.${fallbackExtension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(`Failed to export reports ${format === "excel" ? "Excel" : "CSV"}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Reports</h1>
          <p className="text-sm text-slate-600">Platform trends and hiring funnel metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void downloadReports("csv")}
            disabled={downloadingFormat !== null}
          >
            {downloadingFormat === "csv" ? "Exporting CSV..." : "Export CSV"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void downloadReports("excel")}
            disabled={downloadingFormat !== null}
          >
            {downloadingFormat === "excel" ? "Exporting Excel..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {error ? <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </Card>
        ))}
      </div>

      {loading || !data ? (
        <Card className="p-6 text-sm text-slate-600">Loading reports...</Card>
      ) : (
        <>
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Realtime Diagnostics</h3>
            {!realtimeMetrics ? (
              <p className="text-sm text-slate-600">Realtime metrics unavailable.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Updated {new Date(realtimeMetrics.lastUpdatedAt).toLocaleString()}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Msg Stream Active</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {realtimeMetrics.counters.messages_stream_active}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Notif Stream Active</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {realtimeMetrics.counters.notifications_stream_active}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Send Failures</p>
                    <p className="text-xl font-semibold text-red-600">
                      {realtimeMetrics.counters.messages_send_failure}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Read Updates</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {realtimeMetrics.counters.messages_read_updates}
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Job Status Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.jobStatusCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Application Funnel</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.applicationStatusCounts}
                      dataKey="count"
                      nameKey="status"
                      outerRadius={110}
                      label
                    >
                      {data.applicationStatusCounts.map((entry, index) => (
                        <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">6-Month Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="jobs" stroke="#0ea5e9" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Referral Performance</h3>
              {!referrals ? (
                <p className="text-sm text-slate-600">Referral data unavailable.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Total referrals: <span className="font-semibold text-slate-900">{referrals.totalReferrals}</span>
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={referrals.referralsByStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Admin Activity</h3>
              {!auditFeed || auditFeed.events.length === 0 ? (
                <p className="text-sm text-slate-600">No recent activity found.</p>
              ) : (
                <ul className="space-y-3">
                  {auditFeed.events.map((event, index) => (
                    <li key={`${event.type}-${event.timestamp}-${index}`} className="border rounded-md p-3">
                      <p className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
                      <p className="text-sm font-medium text-slate-900">{event.detail}</p>
                      <p className="text-xs text-slate-600">Actor: {event.actor}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}