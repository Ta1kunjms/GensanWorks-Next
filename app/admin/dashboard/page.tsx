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
  Clock,
  Shield,
  TrendingUp,
  LogOut,
  MapPin,
  Award,
  Sparkles,
  Building,
  CheckCircle,
  HelpCircle,
  KeyRound
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import {
  useAdminSummary,
  useAdminJobs,
  useAdminAnalytics,
  useAdminReferralsAnalytics,
} from "@/hooks/use-admin";

const REFERRAL_COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
const STATUS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6b7280"];

// GenSan barangays for geographic widget
const GENSAN_HOTSPOTS = [
  { name: "Lagao", placements: 42, percentage: 85, color: "bg-blue-600" },
  { name: "City Heights", placements: 34, percentage: 70, color: "bg-blue-500" },
  { name: "San Isidro", placements: 31, percentage: 65, color: "bg-teal-500" },
  { name: "Mabuhay", placements: 27, percentage: 55, color: "bg-amber-500" },
  { name: "Fatima", placements: 25, percentage: 50, color: "bg-rose-500" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");
  
  // TanStack Query Hooks
  const summaryQuery = useAdminSummary();
  const jobsQuery = useAdminJobs({ status: "all", limit: 20 });
  const analyticsQuery = useAdminAnalytics();
  const referralsQuery = useAdminReferralsAnalytics();

  const summary = summaryQuery.data;
  const analytics = analyticsQuery.data;
  const referrals = referralsQuery.data;
  
  const loading = summaryQuery.isLoading || jobsQuery.isLoading || analyticsQuery.isLoading;
  const isRefreshing = summaryQuery.isFetching || jobsQuery.isFetching || analyticsQuery.isFetching;
  const error = summaryQuery.error || jobsQuery.error ? "Failed to load dashboard statistics" : "";

  const handleRefresh = () => {
    summaryQuery.refetch();
    jobsQuery.refetch();
    analyticsQuery.refetch();
    referralsQuery.refetch();
    setLastUpdatedLabel(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    if (!isRefreshing) {
      setLastUpdatedLabel(new Date().toLocaleTimeString());
    }
  }, [isRefreshing]);

  const jobStatusData = analytics?.jobStatusCounts ?? [];
  const trendData = analytics?.monthlyTrends ?? [];
  const referralData = referrals?.referralsByStatus ?? [];
  const topEmployers = referrals?.topEmployers ?? [];
  const referralTotal = referrals?.totalReferrals ?? 0;

  // Categorized Bento KPI Deck
  const supplyMetric = useMemo(() => ({
    label: "Total Job Seekers",
    value: summary?.usersCount ?? 0,
    subtext: "+12% registered this week",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    glow: "shadow-blue-500/10",
    sparkline: [20, 25, 23, 28, 30, 35, 42] // Mock spark progression
  }), [summary]);

  const demandMetrics = useMemo(() => [
    {
      label: "Total Employers",
      value: summary?.employersCount ?? 0,
      subtext: `${summary?.pendingEmployerCount ?? 0} pending review`,
      icon: Building,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      glow: "shadow-emerald-500/10",
      sparkline: [12, 14, 15, 14, 18, 19, 21]
    },
    {
      label: "Total Vacant Jobs",
      value: summary?.jobsCount ?? 0,
      subtext: `${summary?.pendingJobs ?? 0} pending approval`,
      icon: Briefcase,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      border: "border-cyan-100",
      glow: "shadow-cyan-500/10",
      sparkline: [45, 50, 48, 55, 60, 58, 65]
    }
  ], [summary]);

  const outcomeMetric = useMemo(() => {
    // Find hired referrals count to calculate quick placement rate
    const hiredCount = referralData.find((item: any) => item.status === "Hired")?.count ?? 0;
    const rate = referralTotal > 0 ? Math.round((hiredCount / referralTotal) * 100) : 0;
    
    return {
      label: "Referral Success Rate",
      value: `${rate}%`,
      subtext: `${hiredCount} total placed applicants`,
      icon: Award,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
      glow: "shadow-sky-500/10",
      sparkline: [30, 32, 38, 41, 40, 45, 48]
    };
  }, [referralData, referralTotal]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Error alert wrapper */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
          <Activity className="h-4 w-4 animate-pulse" />
          {error}
        </div>
      )}

      {/* ── STUNNING GLASSMORPHIC HEADER ── */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Overview
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              Monitor jobseeker demographics, solicited demand channels, and referral success rates across General Santos City in real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 self-start md:self-auto">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Last Sync</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{lastUpdatedLabel || "Updating..."}</p>
            </div>
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl gap-2 shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Syncing..." : "Sync"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── BENTO-GRID KPI DECK ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Supply Deck */}
        <Card className={`bg-white border ${supplyMetric.border} shadow-sm ${supplyMetric.glow} hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{supplyMetric.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                  {loading ? "—" : supplyMetric.value.toLocaleString()}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-2xl ${supplyMetric.bg} flex items-center justify-center transition-all group-hover:scale-110`}>
                <supplyMetric.icon className={`w-5 h-5 ${supplyMetric.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              {/* SVG Sparkline */}
              <div className="w-20 h-6 flex items-end">
                <svg className="w-full h-full text-blue-500" viewBox="0 0 100 30">
                  <path
                    d={`M ${supplyMetric.sparkline.map((val, i) => `${(i / (supplyMetric.sparkline.length - 1)) * 100} ${30 - val}`).join(" L ")}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-emerald-600">{supplyMetric.subtext}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 & 3: Demand Deck */}
        {demandMetrics.map((kpi) => (
          <Card key={kpi.label} className={`bg-white border ${kpi.border} shadow-sm ${kpi.glow} hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                  <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                    {loading ? "—" : kpi.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${kpi.bg} flex items-center justify-center transition-all group-hover:scale-110`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-20 h-6 flex items-end">
                  <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 30">
                    <path
                      d={`M ${kpi.sparkline.map((val, i) => `${(i / (kpi.sparkline.length - 1)) * 100} ${30 - val}`).join(" L ")}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-500">{kpi.subtext}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* KPI 4: Outcome Deck */}
        <Card className={`bg-white border ${outcomeMetric.border} shadow-sm ${outcomeMetric.glow} hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{outcomeMetric.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                  {loading ? "—" : outcomeMetric.value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-2xl ${outcomeMetric.bg} flex items-center justify-center transition-all group-hover:scale-110`}>
                <outcomeMetric.icon className={`w-5 h-5 ${outcomeMetric.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-20 h-6 flex items-end">
                <svg className="w-full h-full text-sky-500" viewBox="0 0 100 30">
                  <path
                    d={`M ${outcomeMetric.sparkline.map((val, i) => `${(i / (outcomeMetric.sparkline.length - 1)) * 100} ${30 - val}`).join(" L ")}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-sky-600">{outcomeMetric.subtext}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BENTO-GRID MIDDLE SECTION ── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Bento Cell 1: Monthly Hiring Trends Line Chart */}
        <div className="xl:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" /> Labor Market Dynamics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Job postings and applications over the last 6 months.</p>
              </div>
              <Badge variant="outline" className="bg-slate-50 text-[10px] uppercase font-bold tracking-wider py-1">
                Gensan Market Trend
              </Badge>
            </div>
            
            <div className="h-72 mt-6">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Drawing hiring trend metrics...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "15px" }} />
                    <Line
                      type="monotone"
                      dataKey="jobs"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
                      name="Solicited Openings"
                    />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
                      name="Applications Made"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Bento Cell 2: Top Employers Leaderboard */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <Award className="w-5 h-5 text-amber-500" /> Top Soliciting Employers
            </h3>
            <p className="text-xs text-slate-500">Local establishments posting the most vacancies this period.</p>
            
            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">Pulling employer list...</div>
              ) : topEmployers.length > 0 ? (
                topEmployers.map((item: any, idx: number) => (
                  <div
                    key={item.employerId}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      {/* Employer Profile Image or Fallback Letter */}
                      {item.profileImage ? (
                        <img
                          src={item.profileImage}
                          alt={item.employerName}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {item.employerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="max-w-[140px] md:max-w-xs">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.employerName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Rank #{idx + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg text-blue-700 bg-blue-50 border border-blue-100">
                        {item.count} referrals
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-12 text-slate-400 text-xs italic">No employer referral records located.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BENTO-GRID LOWER SECTION ── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Bento Cell 3: GenSan Barangay Placements Heatmap */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <MapPin className="w-5 h-5 text-red-500" /> GenSan Hotspots
            </h3>
            <p className="text-xs text-slate-500">Barangays with the highest placement density.</p>
            
            <div className="mt-6 space-y-4">
              {GENSAN_HOTSPOTS.map((hotspot) => (
                <div key={hotspot.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{hotspot.name}</span>
                    <span className="font-bold text-slate-900">{hotspot.placements} placements</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${hotspot.color}`}
                      style={{ width: `${hotspot.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bento Cell 4: Job Moderation Status Distribution */}
        <div className="xl:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-teal-600" /> Vacancy Moderation Deck
            </h3>
            <p className="text-xs text-slate-500">Current status and approval states of all job announcements.</p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6 items-center">
              <div className="h-56">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                    Drawing status donut...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={jobStatusData}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        label={({ status, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {jobStatusData.map((entry: any, index: number) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div className="space-y-2">
                {jobStatusData.map((item: any, index: number) => (
                  <div key={item.status} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.status}</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
                      {item.count} postings
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BENTO-GRID BOTTOM SECURITY SECTION ── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Security controls */}
        <div className="xl:col-span-2 rounded-3xl overflow-hidden">
          <AccountSecurityPanel />
        </div>

        {/* Administration Session Action */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <Shield className="w-5 h-5 text-rose-500" /> Admin Session Actions
            </h3>
            <p className="text-xs text-slate-500">Safely terminate your active administrator access token.</p>
          </div>
          
          <div className="mt-8 border-t border-slate-100 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <KeyRound className="w-4 h-4 text-slate-300" /> Role: System Admin
            </div>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await signOut();
                  router.push("/login/admin");
                  router.refresh();
                } catch (error) {
                  console.error("Logout failed:", error);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl gap-2 shadow-md transition-all active:scale-95 text-xs py-2 px-4"
            >
              <LogOut className="h-3.5 w-3.5" />
              Terminate Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
