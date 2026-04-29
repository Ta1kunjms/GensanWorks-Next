"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Brain, User, MessageSquare, ExternalLink, AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ScoreBreakdown = {
  f1_skill_match: number;
  f2_experience_arc: number;
  f3_education_qpe: number;
  f4_logistics: number;
  f5_salary: number;
};

type CandidateScore = {
  rank: number;
  jobseekerId: string;
  name: string;
  email: string;
  nsrpId?: string;
  jobSeekingStatus: string;
  utilityScore: number;
  grade: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
  dimensionScores: Record<string, { raw: number; weighted: number; weight_used: number }>;
  summary: string;
  strengths: string[];
  gaps: string[];
  biasFlags: string[];
  constraintViolations: string[];
  computedAt: string;
  // Legacy fields for compat
  suitabilityScore: number;
  scoreBreakdown: any;
  aiSummary: string;
};

type EmployerMatchReport = {
  job: { position_title: string };
  scores: CandidateScore[];
};

const DIMENSION_LABELS: Record<string, string> = {
  f1_skill_match: "Skills",
  f2_experience_arc: "Experience",
  f3_education_qpe: "Edu/QPE",
  f4_logistics: "Logistics",
  f5_salary: "Salary",
};

function GradeBadge({ grade }: { grade: string }) {
  const styles = {
    Excellent: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Strong: "bg-blue-100 text-blue-700 border-blue-200",
    Good: "bg-amber-100 text-amber-700 border-amber-200",
    Fair: "bg-orange-100 text-orange-700 border-orange-200",
    Weak: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <Badge variant="outline" className={`font-bold ${styles[grade as keyof typeof styles] ?? "bg-slate-100 text-slate-600"}`}>
      {grade}
    </Badge>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 85 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                score >= 70 ? "text-blue-600 bg-blue-50 border-blue-200" :
                score >= 55 ? "text-amber-600 bg-amber-50 border-amber-200" :
                              "text-rose-600 bg-rose-50 border-rose-200";
  const barColor = score >= 85 ? "bg-emerald-500" : 
                   score >= 70 ? "bg-blue-500" : 
                   score >= 55 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl border ${color} min-w-[80px]`}>
      <span className="text-2xl font-black">{Math.round(score)}%</span>
      <div className="w-full h-1.5 bg-white/60 rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function DetailedBreakdown({ scores }: { scores: Record<string, { raw: number; weighted: number; weight_used: number }> }) {
  return (
    <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
      {Object.entries(scores).map(([key, val]) => {
        const rawPercent = Math.round(val.raw * 100);
        return (
          <div key={key} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{DIMENSION_LABELS[key] ?? key}</div>
            <div className="flex items-end gap-1">
              <span className={`text-sm font-black ${rawPercent >= 80 ? "text-emerald-600" : rawPercent >= 60 ? "text-amber-600" : "text-rose-500"}`}>
                {rawPercent}%
              </span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${rawPercent >= 80 ? "bg-emerald-400" : rawPercent >= 60 ? "bg-amber-300" : "bg-rose-300"}`}
                style={{ width: `${rawPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EmployerMatchingReportPage() {
  const params = useParams<{ job_id: string }>();
  const jobId = params?.job_id;

  const [report, setReport] = useState<EmployerMatchReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const res = await fetch(`/api/employer/matching/${jobId}`);
    if (res.ok) {
      const data = await res.json() as EmployerMatchReport;
      setReport(data);
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  const jobTitle = report?.job?.position_title ?? "Loading...";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href={`/employer/jobs/${jobId}`}>
            <Button variant="ghost" size="icon" className="rounded-full mt-1">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligent Matching</h1>
                <p className="text-slate-500 font-medium">{jobTitle}</p>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => void fetchReport()} className="gap-2">
          Refresh Scores
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : !report?.scores || report.scores.length === 0 ? (
        <Card className="p-20 text-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-3xl">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">No Match Report Found</h2>
            <p className="text-slate-500 mt-2">
              PESO Gensan is currently processing the AI suitability analysis for this job posting. Please check back later or contact your PESO officer.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="p-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl shadow-lg shadow-purple-200 flex items-center gap-4">
             <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
               <Brain className="w-6 h-6 text-white" />
             </div>
             <div>
               <p className="font-bold text-lg leading-none">PESO AI Utility Engine v3</p>
               <p className="text-white/80 text-sm mt-1">Advanced rational matching with bias-mitigation and qualified professional equivalence (QPE) logic.</p>
             </div>
          </div>

          {report.scores.map((candidate) => (
            <Card key={candidate.jobseekerId} className="overflow-hidden border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 rounded-3xl">
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {/* Left Column: Rank & Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${
                      candidate.rank === 1 ? "bg-yellow-400 text-white" :
                      candidate.rank === 2 ? "bg-slate-300 text-slate-700" :
                      candidate.rank === 3 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      #{candidate.rank}
                    </div>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center border-4 border-white shadow-inner overflow-hidden">
                      <User className="w-7 h-7 text-slate-400" />
                    </div>
                  </div>

                  {/* Middle Column: Info & Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-slate-900 leading-tight">{candidate.name}</h3>
                          <GradeBadge grade={candidate.grade ?? "N/A"} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2">
                            {candidate.jobSeekingStatus?.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-slate-400">• Computed {new Date(candidate.computedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ScoreGauge score={candidate.utilityScore ?? candidate.suitabilityScore} />
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                        &ldquo;{candidate.summary || candidate.aiSummary}&rdquo;
                      </p>
                    </div>

                    {/* Strengths & Gaps */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Key Strengths</p>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.strengths?.map((s, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">Addressable Gaps</p>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.gaps?.length ? candidate.gaps.map((g, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 font-medium">
                              {g}
                            </span>
                          )) : (
                            <span className="text-xs text-slate-400 italic">No significant gaps found</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bias Flags & Constraint Violations */}
                    {(candidate.biasFlags?.length > 0 || candidate.constraintViolations?.length > 0) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidate.biasFlags?.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-tight">
                            <AlertCircle className="w-3 h-3" /> {f}
                          </div>
                        ))}
                        {candidate.constraintViolations?.map((v, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase tracking-tight">
                            <AlertCircle className="w-3 h-3" /> {v}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detailed Dimension Breakdown */}
                    <DetailedBreakdown scores={candidate.dimensionScores ?? candidate.scoreBreakdown} />
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Link href={`/profile/${candidate.nsrpId ?? candidate.jobseekerId}`} target="_blank">
                      <Button className="w-full justify-start gap-2 h-10 rounded-xl bg-slate-900 hover:bg-black text-white border-0 shadow-lg shadow-slate-200">
                        <User className="w-4 h-4" /> View Profile
                      </Button>
                    </Link>
                    <Link href={`/employer/messages?peerId=${candidate.jobseekerId}`}>
                      <Button variant="outline" className="w-full justify-start gap-2 h-10 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors">
                        <MessageSquare className="w-4 h-4" /> Message
                      </Button>
                    </Link>
                    <Button variant="ghost" className="w-full justify-start gap-2 h-10 rounded-xl text-slate-400 hover:text-slate-600">
                       <ExternalLink className="w-4 h-4" /> Share Internally
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
