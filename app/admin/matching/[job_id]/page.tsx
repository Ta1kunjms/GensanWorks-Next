"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Brain, Send, RefreshCw, Download, Loader2,
  Info, User, MessageSquare, ExternalLink, CheckCircle2, Clock,
  Building2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ScoreDimension = {
  raw: number;
  weighted: number;
  weight_used: number;
};

type ScoreBreakdown = {
  skills_match: ScoreDimension | number;
  experience_relevance: ScoreDimension | number;
  education_fit: ScoreDimension | number;
  location_match: ScoreDimension | number;
  salary_alignment: ScoreDimension | number;
  work_setup_match?: ScoreDimension | number;
  certifications_bonus?: ScoreDimension | number;
};

type CandidateScore = {
  rank: number;
  jobseekerId: string;
  name: string;
  email: string;
  nsrpId?: string;
  jobSeekingStatus: string;
  suitabilityScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchEvidence?: { rule: string; semantic: string; behavior: string };
  topReasons: string[];
  biasFlags: string[];
  aiSummary: string;
  computedAt: string;
  sentToEmployer: boolean;
};

type MatchReport = {
  job: { position_title: string; employers: { id: string; establishment_name: string } };
  scores: CandidateScore[];
  totalScored: number;
  lastComputedAt: string | null;
  sentToEmployer: boolean;
};

const BREAKDOWN_LABELS: Record<string, string> = {
  skills_match: "Skills",
  experience_relevance: "Experience",
  education_fit: "Education",
  location_match: "Location",
  salary_alignment: "Salary",
  work_setup_match: "Work Setup",
  certifications_bonus: "Certs",
  f1: "Skills",
  f2: "Experience",
  f3: "Education",
  f4: "Logistics",
  f5: "Salary",
  f6: "Completeness",
};

/**
 * AdminMatchingReportPage
 * Refactored to match the system's core design system.
 */

function ScoreBadge({ score }: { score: number }) {
  const colors = score >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                 score >= 60 ? "bg-amber-100 text-amber-700 border-amber-200" :
                               "bg-rose-100 text-rose-700 border-rose-200";
  return (
    <div className={`px-4 py-2 rounded-xl border ${colors} flex flex-col items-center justify-center min-w-[80px]`}>
      <span className="text-xl font-black">{score}%</span>
      <span className="text-[9px] uppercase tracking-widest font-bold opacity-80">Match</span>
    </div>
  );
}

function MiniBreakdown({ breakdown }: { breakdown: ScoreBreakdown | any }) {
  const validKeys = Object.keys(BREAKDOWN_LABELS);
  const entries = Object.entries(breakdown || {}).filter(([key]) => validKeys.includes(key));

  return (
    <div className="grid grid-cols-6 gap-3 mt-4">
      {entries.map(([key, val]) => {
        let rawVal = typeof val === "number" ? val : (val as any)?.raw ?? 0;
        let scoreVal = rawVal <= 1.0 && rawVal > 0 ? Math.round(rawVal * 100) : Math.round(rawVal);
        const label = BREAKDOWN_LABELS[key] || key;

        return (
          <div key={key} className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{label}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreVal >= 80 ? "bg-emerald-500" : scoreVal >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                  style={{ width: `${scoreVal}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-700 w-6">{scoreVal}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminMatchingReportPage() {
  const params = useParams<{ job_id: string }>();
  const jobId = params?.job_id;

  const [report, setReport] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [employerId, setEmployerId] = useState("");
  const [sent, setSent] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState<Record<string, boolean>>({});

  const fetchReport = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/matching/${jobId}`);
    if (res.ok) {
      const data = await res.json() as MatchReport;
      setReport(data);
      setSent(data.sentToEmployer);
      if (data.job?.employers?.id) {
        setEmployerId(data.job.employers.id);
      }
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  const runMatching = async () => {
    if (!jobId || running) return;
    setRunning(true);
    await fetch(`/api/admin/matching/${jobId}`, { method: "POST" });
    await fetchReport();
    setRunning(false);
  };

  const sendToEmployer = async () => {
    if (!jobId || !employerId || sending) return;
    setSending(true);
    const res = await fetch(`/api/admin/matching/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employerId }),
    });
    if (res.ok) setSent(true);
    setSending(false);
  };

  const generateNarrative = async (jobseekerId: string) => {
    setNarrativeLoading(prev => ({ ...prev, [jobseekerId]: true }));
    try {
      const res = await fetch("/api/matching/narrative", {
        method: "POST",
        body: JSON.stringify({ jobId, jobseekerId })
      });
      if (res.ok) {
        const narrative = await res.json();
        setReport(prev => {
          if (!prev) return null;
          return {
            ...prev,
            scores: prev.scores.map(s => s.jobseekerId === jobseekerId ? { ...s, aiSummary: narrative.summary } : s)
          };
        });
      }
    } finally {
      setNarrativeLoading(prev => ({ ...prev, [jobseekerId]: false }));
    }
  };

  const giveFeedback = async (jobseekerId: string, signalType: string) => {
    await fetch("/api/matching/feedback", {
      method: "POST",
      body: JSON.stringify({ jobId, jobseekerId, signalType })
    });
  }

  const filteredScores = report?.scores.filter((s) => s.suitabilityScore >= minScore) ?? [];

  const jobTitle = report?.job?.position_title ?? "Loading...";
  const employerName = (report?.job?.employers as unknown as { establishment_name?: string })?.establishment_name ?? "";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-4">
          <Link href="/admin/matching" className="inline-flex items-center text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-3 h-3 mr-1" /> Back to Matching
          </Link>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.9]">
              AI Suitability Report
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {jobTitle} <span className="text-slate-300">•</span> {employerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-bold gap-2" onClick={() => void runMatching()} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? "Regenerating..." : "Re-run Engine"}
          </Button>
          {!sent ? (
            <Button
              className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 shadow-lg shadow-slate-200"
              onClick={() => void sendToEmployer()}
              disabled={sending || !report?.scores.length || !employerId}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispatch to Employer
            </Button>
          ) : (
            <div className="h-12 px-6 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Sent to Employer
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      {!loading && report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Scored", value: report.totalScored, color: "text-slate-900", border: "border-slate-100" },
            { label: "High Match", value: report.scores.filter((s) => s.suitabilityScore >= 80).length, color: "text-emerald-700", border: "border-emerald-100 bg-emerald-50/30" },
            { label: "Medium Fit", value: report.scores.filter((s) => s.suitabilityScore >= 60 && s.suitabilityScore < 80).length, color: "text-amber-700", border: "border-amber-100 bg-amber-50/30" },
            { label: "Low Fit", value: report.scores.filter((s) => s.suitabilityScore < 60).length, color: "text-rose-700", border: "border-rose-100 bg-rose-50/30" },
          ].map((stat) => (
            <Card key={stat.label} className={`p-6 rounded-3xl border ${stat.border} shadow-sm`}>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Threshold Controls */}
      <div className="flex items-center gap-6 bg-slate-50/50 p-2 rounded-[1.5rem] border border-slate-100 w-fit">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Filter Threshold</span>
        <div className="flex items-center gap-1">
          {[0, 50, 60, 70, 80].map((v) => (
            <button
              key={v}
              onClick={() => setMinScore(v)}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${
                minScore === v ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === 0 ? "All" : `${v}%+`}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate Ranking List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-[2.5rem]" />)}
        </div>
      ) : filteredScores.length === 0 ? (
        <Card className="p-20 text-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/30">
          <div className="max-w-xs mx-auto">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">No Candidates Found</h3>
            <p className="text-sm text-slate-500 font-bold mt-2">
              Run the matching engine or adjust your score threshold to see potential matches.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredScores.map((candidate) => (
            <Card key={candidate.jobseekerId} className="overflow-hidden rounded-[2.5rem] border border-slate-200 hover:shadow-xl hover:shadow-slate-100 transition-all group p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Side: Identity & Status */}
                <div className="flex items-start gap-5 lg:w-72 shrink-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                    candidate.rank === 1 ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-slate-100 text-slate-500"
                  }`}>
                    #{candidate.rank}
                  </div>
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      {candidate.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{candidate.name}</h3>
                      <div className="flex flex-col gap-1.5 pt-1">
                        {candidate.nsrpId && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {candidate.nsrpId}</span>
                        )}
                        <Badge className={`w-fit text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                          candidate.jobSeekingStatus === "actively_looking" ? "bg-emerald-100 text-emerald-700" :
                          candidate.jobSeekingStatus === "open" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {candidate.jobSeekingStatus === "actively_looking" ? "Actively Looking" :
                           candidate.jobSeekingStatus === "open" ? "Open to Work" : "Passive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center: Intelligence & Breakdown */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-4 flex-1 max-w-xl">
                      {/* Evidence Panels */}
                      {candidate.matchEvidence && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Technical Fit</p>
                            <p className="text-xs font-bold text-slate-700 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              {candidate.matchEvidence.rule}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Semantic Logic</p>
                            <p className="text-xs font-bold text-slate-700 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              {candidate.matchEvidence.semantic}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Narrative Summary */}
                      <div className="bg-slate-900/5 p-4 rounded-2xl relative">
                        <MessageSquare className="w-4 h-4 text-slate-300 absolute -top-2 -left-2 bg-white rounded-full p-0.5" />
                        {candidate.aiSummary ? (
                          <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                            &ldquo;{candidate.aiSummary}&rdquo;
                          </p>
                        ) : (
                          <Button
                            variant="ghost"
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-transparent p-0"
                            onClick={() => generateNarrative(candidate.jobseekerId)}
                            disabled={narrativeLoading[candidate.jobseekerId]}
                          >
                            {narrativeLoading[candidate.jobseekerId] ? "Processing..." : "+ Generate Candidate Brief"}
                          </Button>
                        )}
                      </div>
                    </div>

                    <ScoreBadge score={candidate.suitabilityScore} />
                  </div>

                  {/* Progressive Score Breakdown */}
                  <MiniBreakdown breakdown={candidate.scoreBreakdown} />
                </div>

                {/* Right Side: Actions */}
                <div className="lg:w-48 flex flex-col gap-2 pt-4 lg:pt-0 lg:border-l lg:border-slate-100 lg:pl-8">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 lg:text-center">Decision Panel</p>
                  <Button
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-50 transition-all hover:-translate-y-0.5"
                    onClick={() => giveFeedback(candidate.jobseekerId, 'shortlisted')}
                  >
                    Shortlist
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
                    onClick={() => giveFeedback(candidate.jobseekerId, 'rejected')}
                  >
                    Reject
                  </Button>
                  <Link href={`/admin/applicants/${candidate.jobseekerId}`} className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full h-11 rounded-xl text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-2" /> Full Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
