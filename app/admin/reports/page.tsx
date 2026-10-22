"use client";
export const dynamic = "force-dynamic";

import { toast } from "sonner";
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
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { SkillGap } from "@/lib/lmi-skills";
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
  Printer,
  Calendar,
  Search,
  TableProperties,
  Layers,
  GraduationCap,
  Gauge,
  ListChecks,
  ChevronRight,
  TrendingDown,
  Building,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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

// Chart fills/strokes keep at least 3:1 contrast against the white card (WCAG 1.4.11).
const COLORS = ["#0f766e", "#0369a1", "#b45309", "#ef4444", "#8b5cf6", "#15803d", "#6b7280"];
const STATUS_COLORS: Record<string, string> = {
  hired: "#15803d",
  interview: "#0369a1",
  pending: "#b45309",
  rejected: "#ef4444",
  active: "#0f766e",
  closed: "#6b7280",
};

/** Screen-reader text alternative for a chart (the SVG itself is hidden from assistive tech). */
function ChartSummary({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="sr-only">
      <p>{title}</p>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No data for this chart.</p>
      )}
    </div>
  );
}

// GenSan barangays for heatmap reference
const GENSAN_DISTRICTS = [
  { name: "Dadiangas North", district: "1", placements: 14 },
  { name: "Dadiangas South", district: "1", placements: 21 },
  { name: "Dadiangas West", district: "1", placements: 8 },
  { name: "Dadiangas East", district: "1", placements: 12 },
  { name: "City Heights", district: "2", placements: 34 },
  { name: "Lagao", district: "2", placements: 42 },
  { name: "Mabuhay", district: "2", placements: 27 },
  { name: "San Isidro", district: "2", placements: 31 },
  { name: "Apopong", district: "3", placements: 19 },
  { name: "Baluan", district: "3", placements: 6 },
  { name: "Buayan", district: "4", placements: 11 },
  { name: "Fatima", district: "4", placements: 25 },
  { name: "Katangawan", district: "5", placements: 15 },
  { name: "Bula", district: "5", placements: 23 },
  { name: "Olympog", district: "6", placements: 4 },
];

export default function AdminReportsPage() {
  // Navigation State
  const [outerTab, setOuterTab] = useState<"overview" | "lmi" | "pes">("overview");
  const [pesTab, setPesTab] = useState<"registration" | "referral" | "placement" | "solicitation">("registration");

  // Core Data
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [placement, setPlacement] = useState<PlacementStats | null>(null);
  const [slipStats, setSlipStats] = useState<ReferralSlipsAnalytics | null>(null);
  const [hiringRate, setHiringRate] = useState<EmployerHiringRate | null>(null);
  const [referrals, setReferrals] = useState<ReferralsPayload | null>(null);
  const [auditFeed, setAuditFeed] = useState<AuditFeedPayload | null>(null);

  // LMI / PES State
  const [lmiData, setLmiData] = useState<any>(null);
  const [lmiViewMode, setLmiViewMode] = useState<"interactive" | "official">("interactive");
  const [pesData, setPesData] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<"csv" | "excel" | null>(null);

  // Initialize Core Analytics
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

        if (analyticsRes.ok) setData((await analyticsRes.json()) as AnalyticsPayload);
        if (placementRes.ok) {
          const d = await placementRes.json() as { data?: PlacementStats };
          setPlacement(d.data ?? null);
        }
        if (slipStatsRes.ok) setSlipStats((await slipStatsRes.json()) as ReferralSlipsAnalytics);
        if (hiringRateRes.ok) setHiringRate((await hiringRateRes.json()) as EmployerHiringRate);
        if (referralsRes.ok) setReferrals((await referralsRes.json()) as ReferralsPayload);
        if (auditRes.ok) setAuditFeed((await auditRes.json()) as AuditFeedPayload);
      } catch (err) {
        console.error("Failed to load core stats", err);
        setError("Unable to load reports");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Fetch Dynamic LMI Data
  useEffect(() => {
    if (outerTab !== "lmi") return;
    const fetchLMI = async () => {
      setReportsLoading(true);
      try {
        let url = "/api/admin/reports/lmi";
        const params = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) url += `?${params.join("&")}`;

        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json();
          setLmiData(payload.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setReportsLoading(false);
      }
    };
    void fetchLMI();
  }, [outerTab, startDate, endDate]);

  // Fetch Dynamic PES Data
  useEffect(() => {
    if (outerTab !== "pes") return;
    const fetchPES = async () => {
      setReportsLoading(true);
      try {
        let url = `/api/admin/reports/pes?type=${pesTab}`;
        const params = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
        if (params.length > 0) url += `&${params.join("&")}`;

        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json();
          setPesData(payload.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setReportsLoading(false);
      }
    };
    void fetchPES();
  }, [outerTab, pesTab, startDate, endDate, searchQuery]);

  // Local Client CSV Exporter
  const handleClientExport = (reportName: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      toast.info("No data available to export");
      return;
    }
    // Flatten nested objects and construct headers
    const formatValue = (val: any) => {
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val).replace(/"/g, '""');
    };

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => headers.map(header => `"${formatValue(row[header])}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportName}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Trigger Print dialog
  const handlePrint = () => {
    window.print();
  };

  // Standard Overview KPIs
  const overviewCards = useMemo(() => [
    { label: "Job Seekers", value: data?.overview.usersCount ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Employers", value: data?.overview.employersCount ?? 0, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Jobs", value: data?.overview.jobsCount ?? 0, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Applications", value: data?.overview.applicationsCount ?? 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "AI-Compatible Profiles", value: `${(data?.overview as any)?.aiCompatibleRate ?? 0}%`, icon: Gauge, color: "text-indigo-600", bg: "bg-indigo-50", subtext: `${(data?.overview as any)?.aiCompatibleCount ?? 0} meet ≥60% cutoff` },
  ], [data]);

  return (
    <div className="space-y-6 print-container relative">
      {/* ── PRINT-ONLY STYLES & HEADER ── */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          aside, nav, button, input, select, .no-print, header, footer {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          th, td {
            border: 1px solid #1e293b !important;
            padding: 6px 8px !important;
            text-align: left !important;
            font-size: 10px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Official Government Print Header */}
      <div className="hidden print-only mb-6 border-b-2 border-double border-slate-900 pb-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <img src="/peso-gsc-logo.png" alt="PESO Logo" className="h-16 w-16 object-contain" />
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold leading-tight">Republic of the Philippines</h2>
            <h1 className="text-sm font-bold text-slate-900 uppercase leading-tight">City of General Santos</h1>
            <h2 className="text-[11px] font-bold text-blue-700 leading-tight">PUBLIC EMPLOYMENT SERVICE OFFICE (PESO)</h2>
            <p className="text-[9px] text-slate-500 italic mt-0.5">2nd Floor, LGU Building, Roxas East Avenue, General Santos City</p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-300 pt-2 text-[10px] font-medium text-slate-600 flex justify-between px-6">
          <span>Date Generated: {new Date().toLocaleDateString("en-PH")}</span>
          <span>Reporting System: GensanWorks Dynamic Engine</span>
        </div>
      </div>

      {/* ── INTERACTIVE SCREEN HEADER ── */}
      <div className="border-b border-slate-200 pb-5 no-print">
        <p className="text-xs font-medium text-muted-foreground">PESO Official Analytics</p>
        <PageHeader
          className="mt-1"
          title="Reports & Statistics"
          description="Explore real-time data, official LMI sheets, and detailed operations logs."
          actions={
            /* Global Outer Navigation Switch */
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200" role="group" aria-label="Report sections">
              {([
                { key: "overview", label: "Analytics Overview", Icon: TrendingUp },
                { key: "lmi", label: "LMI Monitoring Form 1", Icon: TableProperties },
                { key: "pes", label: "PES Operations Reports", Icon: Layers },
              ] as const).map(({ key, label, Icon }) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={outerTab === key}
                  onClick={() => setOuterTab(key)}
                  className={`gap-1.5 text-xs font-semibold ${
                    outerTab === key ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
                </Button>
              ))}
            </div>
          }
        />
      </div>

      {/* Global Date Filter Controls (Active for LMI & PES Tab) */}
      {outerTab !== "overview" && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-4 items-center justify-between no-print shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" /> Filter Period:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print Sheet
            </Button>
            {outerTab === "pes" && (
              <Button
                size="sm"
                onClick={() => handleClientExport(pesTab, pesData)}
                className="text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {reportsLoading && (
        <div className="absolute inset-0 bg-white/60 flex justify-center items-center z-10 no-print rounded-lg">
          <div className="flex flex-col items-center gap-2 p-5 bg-white shadow-xl rounded-lg border border-slate-100">
            <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
            <span className="text-xs font-semibold text-slate-700">Updating report data...</span>
          </div>
        </div>
      )}

      {/* ── TAB 1: CORE ANALYTICS OVERVIEW ── */}
      {outerTab === "overview" && (
        <div className="space-y-6 no-print">
          {/* Overview KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {overviewCards.map((card) => (
              <div key={card.label} className="flex flex-col gap-1">
                <StatCard
                  label={card.label}
                  value={loading ? null : card.value}
                  icon={<card.icon className="w-5 h-5" />}
                />
                {card.subtext && (
                  <p className="px-1 text-xs text-muted-foreground">{card.subtext}</p>
                )}
              </div>
            ))}
          </div>

          {/* Placement Stats */}
          {placement && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Hired This Week", value: placement.hiredThisWeek },
                { label: "Hired This Month", value: placement.hiredThisMonth },
                { label: "Hired This Quarter", value: placement.hiredThisQuarter },
                { label: "For Interview", value: placement.forInterview },
                { label: "Pending Referrals", value: placement.pendingReferrals },
                { label: "Success Rate", value: `${placement.successRate}%` },
              ].map((s) => (
                <StatCard key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          )}

          {loading ? (
            <Card className="p-12 text-center text-slate-500 bg-slate-50 border-dashed border-2 rounded-lg">
              Loading analytics and reports databases...
            </Card>
          ) : (
            <Tabs defaultValue="trends" className="w-full">
              <TabsList className="mb-4 bg-slate-100 p-1 rounded-xl h-auto border border-slate-200">
                <TabsTrigger value="trends" className="rounded-lg py-2 px-4 text-xs font-semibold"><TrendingUp className="w-4 h-4 mr-1.5" aria-hidden="true" />Trends</TabsTrigger>
                <TabsTrigger value="heatmap" className="rounded-lg py-2 px-4 text-xs font-semibold"><MapPin className="w-4 h-4 mr-1.5" aria-hidden="true" />Geographic Placement</TabsTrigger>
                <TabsTrigger value="referral-slips" className="rounded-lg py-2 px-4 text-xs font-semibold"><ClipboardCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />Referral Slips</TabsTrigger>
                <TabsTrigger value="employer-rates" className="rounded-lg py-2 px-4 text-xs font-semibold"><Award className="w-4 h-4 mr-1.5" aria-hidden="true" />Employer Hiring Rates</TabsTrigger>
              </TabsList>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="p-6 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-1.5">
                      <Briefcase className="w-5 h-5 text-teal-600" aria-hidden="true" /> Job Status Distribution
                    </h2>
                    <ChartSummary
                      title="Job status distribution"
                      items={(data?.jobStatusCounts ?? []).map((entry) => `${entry.status}: ${entry.count}`)}
                    />
                    <div className="h-72" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.jobStatusCounts ?? []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="status" tick={{ fontSize: 11, fontWeight: 500 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {(data?.jobStatusCounts ?? []).map((entry) => (
                              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#64748b"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                    <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-sky-600" aria-hidden="true" /> Application Funnel
                    </h2>
                    <ChartSummary
                      title="Application funnel"
                      items={(data?.applicationStatusCounts ?? []).map((entry) => `${entry.status}: ${entry.count}`)}
                    />
                    <div className="h-72" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data?.applicationStatusCounts ?? []} dataKey="count" nameKey="status" outerRadius={90} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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

                <Card className="p-6 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                  <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-1.5">
                    <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" /> 6-Month Jobs & Applications Trend
                  </h2>
                  <ChartSummary
                    title="Jobs posted and applications per month"
                    items={(data?.monthlyTrends ?? []).map((row) => `${row.month}: ${row.jobs} jobs posted, ${row.applications} applications`)}
                  />
                  <div className="h-80" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.monthlyTrends ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="jobs" stroke="#0369a1" strokeWidth={3} dot={{ r: 4 }} name="Jobs Posted" />
                        <Line type="monotone" dataKey="applications" stroke="#b45309" strokeWidth={3} dot={{ r: 4 }} name="Applications" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              {/* Geographic Tab */}
              <TabsContent value="heatmap">
                <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <h2 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-1.5">
                    <MapPin className="w-5 h-5 text-red-600" aria-hidden="true" /> Geographic Distribution — General Santos City
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">Barangay-level placement activity aggregated from referred applicant residences.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {GENSAN_DISTRICTS.map((area, idx) => {
                      const hueClass = area.placements > 25 ? "text-emerald-700" : area.placements > 10 ? "text-amber-700" : "text-slate-600";
                      return (
                        <div
                          key={area.name}
                          className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50"
                        >
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{area.name}</p>
                            <p className="text-xs font-medium text-muted-foreground">District {area.district}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-base font-bold px-2.5 py-1 rounded-lg bg-white shadow-sm border border-slate-200 ${hueClass}`}>
                              {area.placements}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>

              {/* Referral Slips Tab */}
              <TabsContent value="referral-slips" className="space-y-6">
                {slipStats ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: "Total Slips Issued", value: slipStats.totalIssued },
                        { label: "Currently Valid", value: slipStats.activeSlips },
                        { label: "Expired / Exhausted", value: slipStats.expiredSlips },
                      ].map((s) => (
                        <StatCard key={s.label} label={s.label} value={s.value} />
                      ))}
                    </div>

                    <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <h2 className="font-bold text-slate-900 text-base mb-4">Monthly Referral Slip Issuance</h2>
                      <ChartSummary
                        title="Referral slips issued per month"
                        items={slipStats.monthlyIssuance.map((row) => `${row.month}: ${row.count} slips issued`)}
                      />
                      <div className="h-64" aria-hidden="true">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={slipStats.monthlyIssuance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} name="Slips Issued" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </>
                ) : (
                  <EmptyState title="No referral slip data available yet." />
                )}
              </TabsContent>

              {/* Employer Hiring Rate Tab */}
              <TabsContent value="employer-rates">
                <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-amber-500" aria-hidden="true" /> Employer Hiring Performance
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Ranked by percent of referred applicants who were successfully placed (Hired).
                      {hiringRate && ` Calculated based on ${hiringRate.totalReferrals} total referrals.`}
                    </p>
                  </div>
                  {!hiringRate || hiringRate.employers.length === 0 ? (
                    <EmptyState className="m-4" headingLevel="h3" title="No employer referral records located." />
                  ) : (
                    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Employer hiring performance table">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50 text-xs font-medium text-muted-foreground">
                          <tr>
                            <th scope="col" className="px-6 py-4 text-left">Rank</th>
                            <th scope="col" className="px-6 py-4 text-left">Employer Name</th>
                            <th scope="col" className="px-6 py-4 text-left">City / Location</th>
                            <th scope="col" className="px-6 py-4 text-right">Referrals Received</th>
                            <th scope="col" className="px-6 py-4 text-right">Applicants Placed</th>
                            <th scope="col" className="px-6 py-4 text-right">Hiring Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {hiringRate.employers.map((emp, idx) => (
                            <tr key={emp.employerId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-muted-foreground font-mono font-bold">#{idx + 1}</td>
                              <td className="px-6 py-4 font-semibold text-slate-900">{emp.employerName}</td>
                              <td className="px-6 py-4 text-slate-500 font-medium">{emp.city || "General Santos City"}</td>
                              <td className="px-6 py-4 text-right text-slate-700 font-semibold">{emp.totalReferrals}</td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-emerald-600 font-bold">{emp.hired}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Badge
                                  className={
                                    emp.hiringRate >= 50
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : emp.hiringRate >= 25
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
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
            </Tabs>
          )}
        </div>
      )}

      {/* ── TAB 2: LMI MONITORING FORM 1 ── */}
      {outerTab === "lmi" && (
        <div className="space-y-6">
          {/* LMI Inner Tabs Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 no-print bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span id="lmi-layout-label" className="text-xs font-medium text-slate-700">Report Layout:</span>
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5" role="group" aria-labelledby="lmi-layout-label">
                <Button
                  type="button"
                  size="sm"
                  variant={lmiViewMode === "interactive" ? "default" : "ghost"}
                  aria-pressed={lmiViewMode === "interactive"}
                  onClick={() => setLmiViewMode("interactive")}
                  className="h-8 px-3 text-xs font-semibold"
                >
                  Interactive Visual Dashboard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={lmiViewMode === "official" ? "default" : "ghost"}
                  aria-pressed={lmiViewMode === "official"}
                  onClick={() => setLmiViewMode("official")}
                  className="h-8 px-3 text-xs font-semibold"
                >
                  Official Government Format
                </Button>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!lmiData) return;
                // Format LMI dataset as flat objects for CSV download
                const flatRows: any[] = [];
                // Industry Demand Table
                Object.values(lmiData.demand.byIndustry || {}).forEach((ind: any) => {
                  flatRows.push({
                    "Report Section": "Manpower Demand (Industry)",
                    "Code/ID": ind.code,
                    "Industry/Item": ind.label,
                    "Jobs Count": ind.jobsCount,
                    "Vacancies Count": ind.vacanciesCount,
                    "Male Counter": "",
                    "Female Counter": ""
                  });
                });
                // Demographics Supply
                flatRows.push({ "Report Section": "Manpower Supply", "Code/ID": "GEN", "Industry/Item": "Total Supply", "Jobs Count": lmiData.supply.total });
                flatRows.push({ "Report Section": "Manpower Supply", "Code/ID": "GEN-M", "Industry/Item": "Male Applicants", "Jobs Count": lmiData.supply.gender.male });
                flatRows.push({ "Report Section": "Manpower Supply", "Code/ID": "GEN-F", "Industry/Item": "Female Applicants", "Jobs Count": lmiData.supply.gender.female });
                flatRows.push({ "Report Section": "Manpower Supply", "Code/ID": "SPC-PWD", "Industry/Item": "PWD Applicants", "Jobs Count": lmiData.supply.specialGroups.pwd });
                flatRows.push({ "Report Section": "Manpower Supply", "Code/ID": "SPC-OFW", "Industry/Item": "OFW Repats", "Jobs Count": lmiData.supply.specialGroups.ofw });
                flatRows.push({ "Report Section": "Manpower Supply", "Code/ID": "SPC-4PS", "Industry/Item": "4Ps Beneficiaries", "Jobs Count": lmiData.supply.specialGroups.fourPs });
                
                // Facilitation
                flatRows.push({ "Report Section": "Employment Facilitation", "Code/ID": "REF", "Industry/Item": "Total Referred", "Jobs Count": lmiData.facilitation.referred.total });
                flatRows.push({ "Report Section": "Employment Facilitation", "Code/ID": "PLC", "Industry/Item": "Total Placed/Hired", "Jobs Count": lmiData.facilitation.placed.total });

                // Skills demand (job postings requiring each top skill)
                ((lmiData.skills?.topRequired ?? []) as SkillGap[]).forEach((row, index) => {
                  flatRows.push({ "Report Section": "Top Required Skills", "Code/ID": `SKL-${index + 1}`, "Industry/Item": row.skill, "Jobs Count": row.demand });
                });

                handleClientExport("Labor_Market_Information_Form_1", flatRows);
              }}
              className="border border-slate-300 text-xs shadow-sm bg-white hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Export LMI CSV
            </Button>
          </div>

          {!lmiData ? (
            <Card className="p-12 text-center text-slate-500 bg-slate-50 border-dashed border-2 rounded-lg">
              No LMI data retrieved. Adjust date range parameters or create new applicant/referral entries.
            </Card>
          ) : lmiViewMode === "interactive" ? (
            // INTERACTIVE LMI VIEW
            <div className="space-y-6 no-print">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supply summary */}
                <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-1.5">
                      <Users className="w-5 h-5 text-blue-600" aria-hidden="true" /> Total Active Supply
                    </h2>
                    <p className="text-xs text-muted-foreground">Total jobseekers registered inside date constraints.</p>
                    <p className="text-5xl font-bold text-slate-900 mt-4 tracking-tight">{lmiData.supply.total}</p>
                  </div>
                  <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Male Applicants:</span>
                      <span className="font-semibold text-slate-950">{lmiData.supply.gender.male} ({lmiData.supply.total > 0 ? Math.round((lmiData.supply.gender.male / lmiData.supply.total) * 100) : 0}%)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Female Applicants:</span>
                      <span className="font-semibold text-slate-950">{lmiData.supply.gender.female} ({lmiData.supply.total > 0 ? Math.round((lmiData.supply.gender.female / lmiData.supply.total) * 100) : 0}%)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Special Group Tags:</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="bg-slate-50 text-[10px]">PWD: {lmiData.supply.specialGroups.pwd}</Badge>
                        <Badge variant="outline" className="bg-slate-50 text-[10px]">OFW: {lmiData.supply.specialGroups.ofw}</Badge>
                        <Badge variant="outline" className="bg-slate-50 text-[10px]">4Ps: {lmiData.supply.specialGroups.fourPs}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Demand summary */}
                <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-1.5">
                      <Briefcase className="w-5 h-5 text-emerald-600" aria-hidden="true" /> Total Solicited Demand
                    </h2>
                    <p className="text-xs text-muted-foreground">Total vacant slots registered by local employers.</p>
                    <p className="text-5xl font-bold text-slate-900 mt-4 tracking-tight">{lmiData.demand.totalVacancies}</p>
                  </div>
                  <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Jobs Posted:</span>
                      <span className="font-semibold text-slate-950">{lmiData.demand.totalJobsPosted} ads</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Top Sectors:</span>
                      <span className="text-xs font-semibold text-slate-600 italic">See Official Grid breakdown</span>
                    </div>
                  </div>
                </Card>

                {/* Facilitation outcomes */}
                <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-violet-600" aria-hidden="true" /> Placements & Hired
                    </h2>
                    <p className="text-xs text-muted-foreground">Referrals resulting in direct employment hires.</p>
                    <p className="text-5xl font-bold text-slate-900 mt-4 tracking-tight">{lmiData.facilitation.placed.total}</p>
                  </div>
                  <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Referred:</span>
                      <span className="font-semibold text-slate-950">{lmiData.facilitation.referred.total} referred</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Placement Success Rate:</span>
                      <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-200">
                        {lmiData.facilitation.successRate}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Age & Demographic Breakdown graphs */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-1">
                    <GraduationCap className="w-5 h-5 text-indigo-500" aria-hidden="true" /> Supply Registry by Age Brackets
                  </h2>
                  <ChartSummary
                    title="Registered jobseekers by age bracket"
                    items={[
                      `Youth (15-24): ${lmiData.supply.ageGroup.youth}`,
                      `Prime (25-34): ${lmiData.supply.ageGroup.prime}`,
                      `Middle (35-44): ${lmiData.supply.ageGroup.middle}`,
                      `Senior (45+): ${lmiData.supply.ageGroup.senior}`,
                    ]}
                  />
                  <div className="h-64" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Youth (15-24)", count: lmiData.supply.ageGroup.youth, fill: "#3b82f6" },
                          { name: "Prime (25-34)", count: lmiData.supply.ageGroup.prime, fill: "#047857" },
                          { name: "Middle (35-44)", count: lmiData.supply.ageGroup.middle, fill: "#b45309" },
                          { name: "Senior (45+)", count: lmiData.supply.ageGroup.senior, fill: "#ef4444" },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-1.5">
                    <Building className="w-5 h-5 text-emerald-500" aria-hidden="true" /> Vacancy solicitation counts by standard sectors
                  </h2>
                  <div className="h-64 overflow-y-auto pr-2 space-y-3">
                    {Object.values(lmiData.demand.byIndustry || {})
                      .filter((ind: any) => ind.vacanciesCount > 0)
                      .map((ind: any) => (
                        <div key={ind.code} className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-700 font-semibold">
                            <span>Code {ind.code}: {ind.label}</span>
                            <span className="text-slate-900">{ind.vacanciesCount} vacancies ({ind.jobsCount} ads)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (ind.vacanciesCount / lmiData.demand.totalVacancies) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    {Object.values(lmiData.demand.byIndustry || {}).filter((ind: any) => ind.vacanciesCount > 0).length === 0 && (
                      <div className="h-full flex justify-center items-center text-muted-foreground text-xs italic">
                        No industry vacancies posted in this filter period.
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Top required skills vs. available supply (SO5) */}
              <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                <h2 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-1.5">
                  <ListChecks className="w-5 h-5 text-amber-600" aria-hidden="true" /> Top required skills vs. available supply
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Demand counts job postings that list a skill; supply counts jobseeker profiles that list it.
                  Descriptive platform data only.
                </p>
                {(lmiData.skills?.topRequired ?? []).length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <ChartSummary
                      title="Top required skills: job postings requiring versus jobseekers offering"
                      items={(lmiData.skills.topRequired as SkillGap[]).map(
                        (row) => `${row.skill}: ${row.demand} postings require, ${row.supply} jobseekers offer`
                      )}
                    />
                    <div className="h-80 xl:col-span-2" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lmiData.skills.topRequired} layout="vertical" margin={{ left: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="skill" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="demand" name="Job postings requiring" fill="#b45309" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="supply" name="Jobseekers offering" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Largest skill gaps</p>
                      {(lmiData.skills.gaps ?? []).length > 0 ? (
                        <ul className="space-y-2 text-xs">
                          {(lmiData.skills.gaps as SkillGap[]).map((row) => (
                            <li key={row.skill} className="flex justify-between gap-2 text-slate-700">
                              <span className="font-medium">{row.skill}</span>
                              <span className="text-slate-500">
                                {row.demand} required / {row.supply} offered
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Supply meets or exceeds demand for every required skill.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex justify-center items-center text-muted-foreground text-xs italic">
                    No required skills recorded on job postings in this filter period.
                  </div>
                )}
              </Card>
            </div>
          ) : (
            // OFFICIAL PRINTABLE DOLE TABLE
            <div className="bg-white border-2 border-slate-800 p-6 sm:p-8 rounded-none shadow-none text-slate-950 font-serif max-w-4xl mx-auto print-container">
              {/* Document Header block */}
              <div className="text-center border-b border-slate-900 pb-3 mb-6">
                <h2 className="text-[10px] tracking-wider uppercase font-semibold leading-tight">DEPARTMENT OF LABOR AND EMPLOYMENT</h2>
                <h2 className="text-[10px] tracking-wider uppercase font-semibold leading-tight">BUREAU OF LOCAL EMPLOYMENT</h2>
                <h2 className="text-sm font-bold uppercase leading-tight mt-1 tracking-tight">LABOR MARKET INFORMATION MONITORING FORM 1</h2>
                <p className="text-[10px] font-bold text-slate-700 mt-1">
                  Reporting Period: {startDate && endDate ? `${formatDate(startDate)} to ${formatDate(endDate)}` : "All Cumulative Data"}
                </p>
              </div>

              {/* SECTION A: MANPOWER SUPPLY */}
              <div className="space-y-4">
                <div className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 border border-slate-800 border-b-0">
                  A. MANPOWER SUPPLY (Jobseeker Registry)
                </div>
                <table className="min-w-full border border-slate-800 text-[10px] leading-tight">
                  <thead className="bg-slate-50 font-bold">
                    <tr>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-left">Indicator (Supply Metrics)</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Male</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Female</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Total Aggregate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-semibold">
                      <td className="border border-slate-800 px-3 py-2">1. Total Registered Jobseekers</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">{lmiData.supply.gender.male}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">{lmiData.supply.gender.female}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right bg-slate-50">{lmiData.supply.total}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">a. Youth (15-24 years old)</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold">{lmiData.supply.ageGroup.youth}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">b. Prime (25-34 years old)</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold">{lmiData.supply.ageGroup.prime}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">c. Middle Career (35-44 years old)</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold">{lmiData.supply.ageGroup.middle}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">d. Late Career / Senior (45+)</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold">{lmiData.supply.ageGroup.senior}</td>
                    </tr>
                    {/* Special cohorts */}
                    <tr className="font-semibold bg-slate-50/50">
                      <td className="border border-slate-800 px-3 py-2">2. Special Demographic Groups</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold">—</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">a. Persons with Disability (PWD)</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold text-blue-700">{lmiData.supply.specialGroups.pwd}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">b. Repatriated OFW / Returning Workers</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold text-emerald-700">{lmiData.supply.specialGroups.ofw}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 pl-6">c. 4Ps Beneficiary Cohorts</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-semibold text-amber-700">{lmiData.supply.specialGroups.fourPs}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION B: MANPOWER DEMAND */}
              <div className="space-y-4 mt-6">
                <div className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 border border-slate-800 border-b-0">
                  B. MANPOWER DEMAND (Vacancies Solicited)
                </div>
                <table className="min-w-full border border-slate-800 text-[10px] leading-tight">
                  <thead className="bg-slate-50 font-bold">
                    <tr>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-left w-20">Code</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-left">SRS Industry Classification Name</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Job Postings</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Vacancies Solicited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(lmiData.demand.byIndustry || {}).map((ind: any) => (
                      <tr key={ind.code} className={ind.vacanciesCount > 0 ? "bg-emerald-50/20 font-medium" : ""}>
                        <td className="border border-slate-800 px-3 py-2 font-mono font-bold text-center">{ind.code}</td>
                        <td className="border border-slate-800 px-3 py-2">{ind.label}</td>
                        <td className="border border-slate-800 px-3 py-2 text-right">{ind.jobsCount}</td>
                        <td className="border border-slate-800 px-3 py-2 text-right font-semibold">{ind.vacanciesCount}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold text-[10px]">
                      <td className="border border-slate-800 px-3 py-2 text-center" colSpan={2}>TOTAL VACANCIES</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">{lmiData.demand.totalJobsPosted}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">{lmiData.demand.totalVacancies}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION C: EMPLOYMENT FACILITATION */}
              <div className="space-y-4 mt-6">
                <div className="bg-slate-100 font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 border border-slate-800 border-b-0">
                  C. EMPLOYMENT FACILITATION (Referrals & Placements)
                </div>
                <table className="min-w-full border border-slate-800 text-[10px] leading-tight">
                  <thead className="bg-slate-50 font-bold">
                    <tr>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-left">Government Action (Facilitation)</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Male</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Female</th>
                      <th scope="col" className="border border-slate-800 px-3 py-2 text-right">Total Aggregate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 font-semibold">1. Total Applicants Referred</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">{lmiData.facilitation.referred.male}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right">{lmiData.facilitation.referred.female}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-bold bg-slate-50">{lmiData.facilitation.referred.total}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-800 px-3 py-2 font-semibold text-emerald-800">2. Total Placements (Placed/Hired)</td>
                      <td className="border border-slate-800 px-3 py-2 text-right text-emerald-800">{lmiData.facilitation.placed.male}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right text-emerald-800">{lmiData.facilitation.placed.female}</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-bold bg-emerald-50 text-emerald-900">{lmiData.facilitation.placed.total}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="border border-slate-800 px-3 py-2">PLACEMENTS RATIO (Success Rate %)</td>
                      <td className="border border-slate-800 px-3 py-2 text-center" colSpan={2}>—</td>
                      <td className="border border-slate-800 px-3 py-2 text-right font-bold text-blue-800">{lmiData.facilitation.successRate}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Verification/Signature block */}
              <div className="mt-12 grid grid-cols-2 gap-8 text-[9px] font-sans no-print flex-wrap">
                <div>
                  <p className="text-slate-500">Prepared By:</p>
                  <div className="mt-8 border-b border-slate-800 w-48 h-5" />
                  <p className="font-semibold text-slate-800 mt-1">PESO LMI Officer</p>
                  <p className="text-muted-foreground">Date: ________________________</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-slate-500">Certified Correct:</p>
                  <div className="mt-8 border-b border-slate-800 w-48 h-5" />
                  <p className="font-semibold text-slate-800 mt-1">PESO Manager / Administrator</p>
                  <p className="text-muted-foreground">Date: ________________________</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PES OPERATIONS REPORTS ── */}
      {outerTab === "pes" && (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 no-print">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[
                { key: "registration", label: "Application Registration" },
                { key: "referral", label: "PES Monthly Referral Report" },
                { key: "placement", label: "Monthly Placement Summary" },
                { key: "solicitation", label: "Vacancy Solicitation Report" },
              ].map((subTab) => (
                <Button
                  key={subTab.key}
                  type="button"
                  size="sm"
                  variant={pesTab === subTab.key ? "default" : "ghost"}
                  aria-pressed={pesTab === subTab.key}
                  onClick={() => {
                    setPesTab(subTab.key as any);
                    setSearchQuery("");
                  }}
                  className="h-8 px-3 text-xs font-semibold"
                >
                  {subTab.label}
                </Button>
              ))}
            </div>

            {/* Filter Search Input */}
            <div className="relative w-full max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rows..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:border-blue-500 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Tabular Lists Grid */}
          <Card className="bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden print-container">
            <div className="p-5 border-b border-slate-100 no-print flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-slate-900 text-base">
                  {pesTab === "registration" && "Jobseeker Application Registrations"}
                  {pesTab === "referral" && "PES Active Referral Records"}
                  {pesTab === "placement" && "Placed Candidate Records (Hired)"}
                  {pesTab === "solicitation" && "Vacancy Solicitation Performance"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Total count: {pesData.length} records found in reporting window.</p>
              </div>
            </div>

            {pesData.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs italic bg-slate-50/50">
                No matching records located in the selected filter constraints.
              </div>
            ) : (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="PES operations records table">
                <table className="min-w-full divide-y divide-slate-100 text-xs text-slate-900">
                  <thead className="bg-slate-50 text-xs font-medium text-muted-foreground">
                    {pesTab === "registration" && (
                      <tr>
                        <th scope="col" className="px-5 py-3.5 text-left">Registration Date</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Candidate Name</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Email Address</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Phone Number</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Barangay</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Demographics</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Employment Status</th>
                      </tr>
                    )}
                    {pesTab === "referral" && (
                      <tr>
                        <th scope="col" className="px-5 py-3.5 text-left">Date Issued</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Slip Number</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Applicant Candidate</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Gender</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Solicited Vacancy</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Establishment</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Outcome Status</th>
                      </tr>
                    )}
                    {pesTab === "placement" && (
                      <tr>
                        <th scope="col" className="px-5 py-3.5 text-left">Date Placed</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Placed Applicant</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Barangay</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Employer</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Position Hired</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Salary/Wage</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Contract Type</th>
                      </tr>
                    )}
                    {pesTab === "solicitation" && (
                      <tr>
                        <th scope="col" className="px-5 py-3.5 text-left">Date Posted</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Employer / Establishment</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Job Position</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Solicited Vacancies</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Filled Vacancies</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Balance Positions</th>
                        <th scope="col" className="px-5 py-3.5 text-left">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pesTab === "registration" &&
                      pesData.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{`${row.first_name || ""} ${row.last_name || ""}`}</td>
                          <td className="px-5 py-3.5 text-slate-600 font-mono">{row.email}</td>
                          <td className="px-5 py-3.5 text-slate-600 font-mono">{row.phone || "—"}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-semibold">{row.barangay || "—"}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 flex-wrap">
                              {row.is_pwd && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">PWD</Badge>}
                              {row.is_ofw && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">OFW</Badge>}
                              {row.is_four_ps && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]">4Ps</Badge>}
                              {!row.is_pwd && !row.is_ofw && !row.is_four_ps && <span className="text-muted-foreground italic">None</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="secondary" className="text-[10px] py-0.5 uppercase">{row.employment_status || "Unknown"}</Badge>
                          </td>
                        </tr>
                      ))}

                    {pesTab === "referral" &&
                      pesData.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">{formatDate(row.issuedAt)}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">{row.slipNumber}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">{row.applicantName}</td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium capitalize">{row.applicantGender || "Not Specified"}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">{row.positionTitle}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-semibold">{row.employerName}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge kind="referral" status={row.status || "Pending"} />
                          </td>
                        </tr>
                      ))}

                    {pesTab === "placement" &&
                      pesData.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">{formatDate(row.dateHired)}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-950">{row.applicantName}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">{row.applicantBarangay}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-semibold">{row.employerName}</td>
                          <td className="px-5 py-3.5 text-slate-800 font-medium">{row.positionTitle}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                            {typeof row.salary === "number" ? `₱${row.salary.toLocaleString()}` : row.salary}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className="text-[10px] font-semibold">{row.contractType}</Badge>
                          </td>
                        </tr>
                      ))}

                    {pesTab === "solicitation" &&
                      pesData.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">{formatDate(row.datePosted)}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{row.employerName}</td>
                          <td className="px-5 py-3.5 text-slate-800 font-medium">{row.positionTitle}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-700">{row.vacanciesSolicited}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{row.vacanciesFilled}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-700">{row.balance}</td>
                          <td className="px-5 py-3.5">
                            <Badge className={row.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}