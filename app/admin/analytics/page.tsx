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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [analyticsRes, realtimeRes] = await Promise.all([
          fetch("/api/admin/analytics", { cache: "no-store" }),
          fetch("/api/admin/realtime-metrics", { cache: "no-store" }),
        ]);

        if (!analyticsRes.ok) {
          setError("Unable to load analytics");
          setData(null);
          return;
        }

        const payload = (await analyticsRes.json()) as AnalyticsPayload;
        setData(payload);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-sm text-slate-600">Platform trends and hiring funnel metrics.</p>
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
        <Card className="p-6 text-sm text-slate-600">Loading analytics...</Card>
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
                <LineChart data={data.monthlyTrends}>
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
        </>
      )}
    </div>
  );
}
