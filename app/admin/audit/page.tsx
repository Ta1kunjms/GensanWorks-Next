"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  BarChart3,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DIMENSIONS = ["gender", "age_bracket", "logistics_zone", "education_level"] as const;

const DIMENSION_LABELS: Record<string, string> = {
  gender: "Gender",
  age_bracket: "Age Bracket",
  logistics_zone: "Logistics Zone",
  education_level: "Education Level",
};

const F_DIMENSIONS = ["f1", "f2", "f3", "f5_location", "f6", "f7"];
const F_LABELS: Record<string, string> = {
  f1: "F1 Skills",
  f2: "F2 Experience",
  f3: "F3 Education",
  f5_location: "F5 Location",
  f6: "F6 Completeness",
  f7: "F7",
};

type FlagLevel = "none" | "low" | "high";

interface BiasRecord {
  dimension: string;
  groupValue: string;
  n: number;
  meanScore: number;
  overallMean: number;
  deviationPct: number;
  pValue: number;
  ksStatistic: number;
  cohensD: number;
  flagLevel: FlagLevel;
  interpretation: string;
}

interface BiasReport {
  jobId: string;
  auditedAt: string;
  totalCandidates: number;
  overallMeanScore: number;
  overallStddev: number;
  records: BiasRecord[];
  flags: BiasRecord[];
  passed: boolean;
  summary: string;
}

interface DimensionScore {
  raw: number;
  confidence: number;
  weighted: number;
}

interface Candidate {
  rank: number;
  jobseekerId: string;
  name: string;
  email: string;
  utilityScore: number;
  suitabilityScore: number;
  finalScore: number;
  grade: string;
  confidenceBand: string;
  dimensionScores: Record<string, DimensionScore>;
  constraintViolations: string[];
  gender: string;
  ageBracket: string;
  logisticsZone: string;
  educationLevel: string;
}

interface JobOption {
  id: string;
  position_title: string;
  created_at: string;
  employers: { establishment_name: string } | { establishment_name: string }[];
}

function flagColor(level: FlagLevel): string {
  switch (level) {
    case "high":
      return "bg-red-50 border-red-200 text-red-700";
    case "low":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "none":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
  }
}

function flagDot(level: FlagLevel): string {
  switch (level) {
    case "high":
      return "bg-red-500";
    case "low":
      return "bg-amber-400";
    case "none":
      return "bg-emerald-500";
  }
}

function FlagBadge({ level }: { level: FlagLevel }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${flagColor(level)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${flagDot(level)}`} />
      {level === "none" ? "Pass" : level === "low" ? "Caution" : "Flagged"}
    </span>
  );
}

function fValueLabel(raw: number | undefined | null): string {
  if (raw === null || raw === undefined) return "—";
  return (raw * 100).toFixed(0);
}

export default function BiasAuditPage() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [report, setReport] = useState<BiasReport | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit/bias")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs ?? []);
        setLoadingJobs(false);
      })
      .catch(() => {
        setLoadingJobs(false);
      });
  }, []);

  const runAudit = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setLoadingAudit(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/audit/bias?jobId=${encodeURIComponent(jobId)}`);
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        setLoadingAudit(false);
        return;
      }
      const data = await res.json();
      setReport(data.auditReport);
      setCandidates(data.candidates ?? []);
    } catch {
      setError("Failed to load audit data.");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) runAudit(selectedJobId);
  }, [selectedJobId, runAudit]);

  const filteredJobs = jobs.filter((j) =>
    j.position_title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSearch) return true;
    const q = candidateSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.jobseekerId.toLowerCase().includes(q)
    );
  });

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          Bias Audit Dashboard
        </h1>
        <p className="text-slate-600 mt-2">
          Detect demographic disparities in AI-generated matching scores across gender, age, location, and education.
        </p>
      </div>

      {/* Job Selector */}
      <Card className="p-4 border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Job</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">&nbsp;</label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="">{loadingJobs ? "Loading jobs..." : "Choose a job..."}</option>
              {filteredJobs.map((j) => {
                const employer = Array.isArray(j.employers) ? j.employers[0] : j.employers;
                return (
                  <option key={j.id} value={j.id}>
                    {j.position_title} — {employer?.establishment_name ?? "Unknown"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading / Error */}
      {loadingAudit && (
        <Card className="p-8 border-slate-200">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </Card>
      )}

      {/* Audit Report */}
      {!loadingAudit && report && (
        <>
          {/* Summary */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="px-6 py-5 bg-white border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Audit Summary</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedJob?.position_title ?? "Unknown job"} &middot; {new Date(report.auditedAt).toLocaleString()}
                  </p>
                </div>
                <Badge
                  variant={report.passed ? "default" : "destructive"}
                  className={`text-sm px-4 py-1.5 ${report.passed ? "bg-emerald-500" : "bg-red-500"}`}
                >
                  {report.passed ? "Audit Passed" : "Audit Failed"}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
              {[
                { icon: Users, label: "Total Candidates", value: report.totalCandidates },
                { icon: BarChart3, label: "Overall Mean Score", value: report.overallMeanScore.toFixed(1) },
                { icon: TrendingUp, label: "Std Dev", value: report.overallStddev.toFixed(1) },
                { icon: AlertTriangle, label: "Disparity Flags", value: report.flags.length, warn: report.flags.length > 0 },
              ].map(({ icon: Icon, label, value, warn }) => (
                <div key={label} className="px-6 py-5 text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-1.5 ${warn ? "text-red-500" : "text-slate-400"}`} />
                  <div className="text-2xl font-bold text-slate-900">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-600">
              {report.summary}
            </div>
          </Card>

          {/* Demographic Disparity Tables */}
          {report.records.length > 0 && (
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <div className="px-6 py-4 bg-white border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Demographic Disparity Analysis</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {DIMENSIONS.map((dim) => {
                  const dimRecords = report.records.filter((r) => r.dimension === dim);
                  if (dimRecords.length === 0) return null;
                  return (
                    <div key={dim} className="p-6">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                        {DIMENSION_LABELS[dim]}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="px-3 py-2 font-semibold text-slate-600">Group</th>
                              <th className="px-3 py-2 font-semibold text-slate-600 text-right">N</th>
                              <th className="px-3 py-2 font-semibold text-slate-600 text-right">Mean</th>
                              <th className="px-3 py-2 font-semibold text-slate-600 text-right">Dev %</th>
                              <th className="px-3 py-2 font-semibold text-slate-600 text-right">KS p-val</th>
                              <th className="px-3 py-2 font-semibold text-slate-600 text-right">Cohen&apos;s d</th>
                              <th className="px-3 py-2 font-semibold text-slate-600 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {dimRecords.map((r, i) => (
                              <tr
                                key={i}
                                className={`transition-colors ${
                                  r.flagLevel === "high"
                                    ? "bg-red-50/40 hover:bg-red-50"
                                    : r.flagLevel === "low"
                                      ? "bg-amber-50/40 hover:bg-amber-50"
                                      : "hover:bg-slate-50/50"
                                }`}
                              >
                                <td className="px-3 py-2.5 font-medium text-slate-900 capitalize">
                                  {r.groupValue.replace(/_/g, " ")}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-700">{r.n}</td>
                                <td className="px-3 py-2.5 text-right text-slate-700">{r.meanScore.toFixed(1)}</td>
                                <td className={`px-3 py-2.5 text-right font-mono ${
                                  r.deviationPct < 0 ? "text-red-600" : "text-emerald-600"
                                }`}>
                                  {r.deviationPct > 0 ? "+" : ""}{r.deviationPct.toFixed(1)}%
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                                  {r.pValue.toFixed(4)}
                                </td>
                                <td className={`px-3 py-2.5 text-right font-mono ${
                                  Math.abs(r.cohensD) >= 0.5 ? "text-red-600 font-bold" : "text-slate-700"
                                }`}>
                                  {r.cohensD.toFixed(3)}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <FlagBadge level={r.flagLevel} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {report.records.length === 0 && (
            <Card className="p-8 border-slate-200 text-center">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">{report.summary}</p>
            </Card>
          )}

          {/* Candidate Scores Table */}
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Candidate Scores</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                  placeholder="Search candidates..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Overall</th>
                    {F_DIMENSIONS.map((fd) => (
                      <th key={fd} className="px-3 py-3 font-semibold text-slate-600 text-right text-xs">
                        {F_LABELS[fd]}
                      </th>
                    ))}
                    <th className="px-3 py-3 font-semibold text-slate-600 text-right">Grade</th>
                    <th className="px-3 py-3 font-semibold text-slate-600 text-center">Demographics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                        No candidates found.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => (
                      <tr key={c.jobseekerId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{c.rank}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">{c.email}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${
                            (c.finalScore ?? c.suitabilityScore) >= 72 ? "text-emerald-600" :
                            (c.finalScore ?? c.suitabilityScore) >= 48 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {((c.finalScore ?? c.suitabilityScore) || 0).toFixed(0)}
                          </span>
                        </td>
                        {F_DIMENSIONS.map((fd) => {
                          const ds = c.dimensionScores?.[fd];
                          return (
                            <td key={fd} className="px-3 py-3 text-right font-mono text-slate-700 text-xs">
                              {ds ? (
                                <span title={`raw: ${(ds.raw * 100).toFixed(0)}% · confidence: ${(ds.confidence * 100).toFixed(0)}%`}>
                                  {fValueLabel(ds.raw)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-right">
                          <Badge variant="outline" className={`font-bold text-xs ${
                            c.grade === "A" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            c.grade === "B" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            c.grade === "C" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            c.grade === "D" ? "bg-orange-50 text-orange-700 border-orange-200" :
                            c.grade === "F" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {c.grade || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`inline-block w-5 h-5 rounded-full text-[9px] font-bold leading-5 ${
                              c.confidenceBand === "high" ? "bg-emerald-100 text-emerald-700" :
                              c.confidenceBand === "medium" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`} title={`Confidence: ${c.confidenceBand}`}>
                              {c.confidenceBand === "high" ? "H" : c.confidenceBand === "medium" ? "M" : "L"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Showing {filteredCandidates.length} of {candidates.length} candidates</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> F1 Skills
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> F2 Experience
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> F3 Education
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> F5 Location
                </span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Initial state - no job selected yet */}
      {!loadingAudit && !report && !error && selectedJobId === "" && (
        <Card className="p-16 border-dashed border-slate-200 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">Select a job to audit</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Choose a job posting from the dropdown above to run demographic bias analysis on its matching scores.
          </p>
        </Card>
      )}

      {!loadingAudit && !report && !error && selectedJobId !== "" && (
        <Card className="p-16 border-dashed border-slate-200 text-center">
          <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No matching data</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            This job has no scored candidates yet. Run matching first from the Matching page.
          </p>
        </Card>
      )}
    </div>
  );
}
