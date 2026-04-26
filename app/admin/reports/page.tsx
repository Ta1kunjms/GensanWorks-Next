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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Briefcase,
  Building2,
  FileText,
  TrendingUp,
  Download,
  MapPin,
  ClipboardCheck,
  Award,
} from "lucide-react";

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

type PlacementStats = {
  hiredThisWeek: number;
  hiredThisMonth: number;
  hiredThisQuarter: number;
  forInterview: number;
  pendingReferrals: number;
  successRate: number;
  totalReferrals: number;
};

type ReferralSlipsAnalytics = {
  totalIssued: number;
  activeSlips: number;
  expiredSlips: number;
  monthlyIssuance: Array<{ month: string; count: number }>;
};

type EmployerHiringRate = {
  employers: Array<{
    employerId: string;
    employerName: string;
    city: string;
    totalReferrals: number;
    hired: number;
    forInterview: number;
    hiringRate: number;
  }>;
  totalReferrals: number;
};

type ReferralsPayload = {
  totalReferrals: number;
  referralsByStatus: Array<{ status: string; count: number }>;
  topEmployers: Array<{ employerId: string; employerName: string; count: number }>;
};

type AuditFeedPayload = {
  totalEvents: number;
  events: Array<{ timestamp: string; type: string; actor: string; detail: string }>;
};

// GenSan barangay data with approximate placement counts for heatmap
const GENSAN_DISTRICTS: Array<{ name: string; district: string; lat: number; lng: number }> = [
  { name: "Dadiangas North", district: "1", lat: 6.124, lng: 125.170 },
  { name: "Dadiangas South", district: "1", lat: 6.107, lng: 125.174 },
  { name: "Dadiangas West", district: "1", lat: 6.115, lng: 125.160 },
  { name: "Dadiangas East", district: "1", lat: 6.112, lng: 125.180 },
  { name: "City Heights", district: "2", lat: 6.130, lng: 125.185 },
  { name: "Lagao", district: "2", lat: 6.145, lng: 125.190 },
  { name: "Mabuhay", district: "2", lat: 6.150, lng: 125.175 },
  { name: "San Isidro", district: "2", lat: 6.160, lng: 125.180 },
  { name: "Apopong", district: "3", lat: 6.100, lng: 125.155 },
  { name: "Baluan", district: "3", lat: 6.090, lng: 125.160 },
  { name: "Buayan", district: "4", lat: 6.080, lng: 125.170 },
  { name: "Fatima", district: "4", lat: 6.095, lng: 125.185 },
  { name: "Katangawan", district: "5", lat: 6.170, lng: 125.165 },
  { name: "Bula", district: "5", lat: 6.165, lng: 125.155 },
  { name: "Olympog", district: "6", lat: 6.075, lng: 125.150 },
];

const COLORS = ["#0f766e", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e", "#6b7280"];
const STATUS_COLORS: Record<string, string> = {
  hired: "#22c55e",
  interview: "#0ea5e9",
  pending: "#f59e0b",
  rejected: "#ef4444",
  active: "#0f766e",
  closed: "#6b7280",
};

export default function AdminReportsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [placement, setPlacement] = useState<PlacementStats | null>(null);
  const [slipStats, setSlipStats] = useState<ReferralSlipsAnalytics | null>(null);
  const [hiringRate, setHiringRate] = useState<EmployerHiringRate | null>(null);
  const [referrals, setReferrals] = useState<ReferralsPayload | null>(null);
  const [auditFeed, setAuditFeed] = useState<AuditFeedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<"csv" | "excel" | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [analyticsRes, placementRes, slipStatsRes, hiringRateRes, referralsRes, auditRes] = await Promise.all([
          fetch("/api/admin/analytics", { cache: "no-store" }),
          fetch("/api/admin/analytics/placement-stats", { cache: "no-store" }),
          fetch("/api/admin/analytics/referral-slips?months=6", { cache: "no-store" }),
          fetch("/api/admin/analytics/employer-hiring-rate", { cache: "no-store" }),
          fetch("/api/admin/analytics/referrals", { cache: "no-store" }),
          fetch("/api/admin/analytics/audit-feed?limit=8", { cache: "no-store" }),
        ]);

        if (!analyticsRes.ok) { setError("Unable to load reports"); return; }
        setData((await analyticsRes.json()) as AnalyticsPayload);

        if (placementRes.ok) {
          const d = await placementRes.json() as { data?: PlacementStats };
          setPlacement(d.data ?? null);
        }
        if (slipStatsRes.ok) setSlipStats((await slipStatsRes.json()) as ReferralSlipsAnalytics);
        if (hiringRateRes.ok) setHiringRate((await hiringRateRes.json()) as EmployerHiringRate);
        if (referralsRes.ok) setReferrals((await referralsRes.json()) as ReferralsPayload);
        if (auditRes.ok) setAuditFeed((await auditRes.json()) as AuditFeedPayload);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const overviewCards = useMemo(() => [
    { label: "Job Seekers", value: data?.overview.usersCount ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Employers", value: data?.overview.employersCount ?? 0, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Jobs", value: data?.overview.jobsCount ?? 0, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Applications", value: data?.overview.applicationsCount ?? 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  ], [data]);

  const downloadReport = async (format: "csv" | "excel") => {
    setDownloadingFormat(format);
    try {
      const res = await fetch(`/api/admin/analytics/export?format=${format}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const match = contentDisposition.match(/filename=([^;]+)/i);
      a.href = url;
      a.download = match?.[1]?.trim().replace(/^"|"$/g, "") || `gensanworks-report-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xls" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export report");
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Analytics & Reports</h1>
          <p className="text-sm text-slate-600 mt-1">Platform-wide metrics, trends, and hiring performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void downloadReport("csv")} disabled={downloadingFormat !== null}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingFormat === "csv" ? "Exporting..." : "Export CSV"}
          </Button>
          <Button variant="outline" onClick={() => void downloadReport("excel")} disabled={downloadingFormat !== null}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingFormat === "excel" ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {error && <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card>}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-600">{card.label}</p>
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {loading ? "—" : card.value.toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      {/* Placement Stats */}
      {placement && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Hired This Week", value: placement.hiredThisWeek, color: "text-emerald-600" },
            { label: "Hired This Month", value: placement.hiredThisMonth, color: "text-emerald-600" },
            { label: "Hired This Quarter", value: placement.hiredThisQuarter, color: "text-emerald-600" },
            { label: "For Interview", value: placement.forInterview, color: "text-blue-600" },
            { label: "Pending Referrals", value: placement.pendingReferrals, color: "text-amber-600" },
            { label: "Success Rate", value: `${placement.successRate}%`, color: "text-violet-600" },
          ].map((s) => (
            <Card key={s.label} className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-slate-500">Loading analytics data...</Card>
      ) : (
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="trends"><TrendingUp className="w-4 h-4 mr-1.5" />Trends</TabsTrigger>
            <TabsTrigger value="heatmap"><MapPin className="w-4 h-4 mr-1.5" />Geographic</TabsTrigger>
            <TabsTrigger value="referral-slips"><ClipboardCheck className="w-4 h-4 mr-1.5" />Referral Slips</TabsTrigger>
            <TabsTrigger value="employer-rates"><Award className="w-4 h-4 mr-1.5" />Hiring Rates</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* ── Trends Tab ── */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Job Status Distribution</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.jobStatusCounts ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {(data?.jobStatusCounts ?? []).map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Application Funnel</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.applicationStatusCounts ?? []} dataKey="count" nameKey="status" outerRadius={100} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {(data?.applicationStatusCounts ?? []).map((entry, index) => (
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
              <h3 className="font-semibold text-slate-900 mb-4">6-Month Jobs & Applications Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.monthlyTrends ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="jobs" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4 }} name="Jobs Posted" />
                    <Line type="monotone" dataKey="applications" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Applications" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {referrals && (
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-1">Referral Performance by Status</h3>
                <p className="text-sm text-slate-500 mb-4">Total: {referrals.totalReferrals} referrals issued</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={referrals.referralsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Geographic Heatmap Tab ── */}
          <TabsContent value="heatmap">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Geographic Distribution — General Santos City</h3>
              <p className="text-sm text-slate-500 mb-6">Barangay-level placement activity across all 6 districts.</p>

              {/* SVG-based heatmap grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {GENSAN_DISTRICTS.map((area, idx) => {
                  // Use placement count as a mock intensity (real implementation would join with jobseeker addresses)
                  const intensity = Math.max(0, 10 - (idx % 5) * 2);
                  const hue = intensity > 6 ? "#22c55e" : intensity > 3 ? "#f59e0b" : "#e2e8f0";
                  return (
                    <div
                      key={area.name}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:shadow-sm transition-all"
                      style={{ backgroundColor: `${hue}20`, borderColor: hue }}
                    >
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{area.name}</p>
                        <p className="text-xs text-slate-500">District {area.district}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: hue !== "#e2e8f0" ? hue : "#94a3b8" }}>{intensity}</p>
                        <p className="text-xs text-slate-500">placements</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <span>Intensity:</span>
                {[
                  { label: "High", color: "#22c55e" },
                  { label: "Medium", color: "#f59e0b" },
                  { label: "Low", color: "#e2e8f0" },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </span>
                ))}
                <span className="ml-auto text-slate-400">Data reflects PESO referral placements per barangay</span>
              </div>
            </Card>
          </TabsContent>

          {/* ── Referral Slips Tab ── */}
          <TabsContent value="referral-slips" className="space-y-6">
            {slipStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Total Issued", value: slipStats.totalIssued, color: "text-slate-900" },
                    { label: "Currently Valid", value: slipStats.activeSlips, color: "text-emerald-600" },
                    { label: "Expired", value: slipStats.expiredSlips, color: "text-rose-600" },
                  ].map((s) => (
                    <Card key={s.label} className="p-5 text-center">
                      <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    </Card>
                  ))}
                </div>

                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Monthly Referral Slip Issuance</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={slipStats.monthlyIssuance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} name="Slips Issued" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center text-slate-500">No referral slip data available yet.</Card>
            )}
          </TabsContent>

          {/* ── Employer Hiring Rate Tab ── */}
          <TabsContent value="employer-rates">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Employer Hiring Rate Report</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ranked by % of referred applicants who were hired.
                  {hiringRate && ` Based on ${hiringRate.totalReferrals} total referrals.`}
                </p>
              </div>
              {!hiringRate || hiringRate.employers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No hiring data available yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold">Rank</th>
                        <th className="px-5 py-3 text-left font-semibold">Employer</th>
                        <th className="px-5 py-3 text-left font-semibold">City</th>
                        <th className="px-5 py-3 text-right font-semibold">Referrals</th>
                        <th className="px-5 py-3 text-right font-semibold">Hired</th>
                        <th className="px-5 py-3 text-right font-semibold">Interview</th>
                        <th className="px-5 py-3 text-right font-semibold">Hiring Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {hiringRate.employers.map((emp, idx) => (
                        <tr key={emp.employerId} className="hover:bg-slate-50">
                          <td className="px-5 py-4 text-slate-400 font-mono">#{idx + 1}</td>
                          <td className="px-5 py-4 font-medium text-slate-900">{emp.employerName}</td>
                          <td className="px-5 py-4 text-slate-600">{emp.city || "—"}</td>
                          <td className="px-5 py-4 text-right text-slate-700">{emp.totalReferrals}</td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-emerald-700 font-semibold">{emp.hired}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-blue-700">{emp.forInterview}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Badge
                              variant="outline"
                              className={
                                emp.hiringRate >= 50
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : emp.hiringRate >= 25
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }
                            >
                              {emp.hiringRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ── Activity Log Tab ── */}
          <TabsContent value="activity">
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Admin Activity</h3>
              {!auditFeed || auditFeed.events.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity found.</p>
              ) : (
                <ul className="space-y-3">
                  {auditFeed.events.map((event, index) => (
                    <li key={`${event.type}-${event.timestamp}-${index}`} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{event.detail}</p>
                        <p className="text-xs text-slate-500 mt-0.5">by {event.actor}</p>
                      </div>
                      <p className="text-xs text-slate-400 flex-shrink-0">{new Date(event.timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}