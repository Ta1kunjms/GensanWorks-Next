"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Brain, Send, RefreshCw, Download, Loader2,
  Info, User, MessageSquare, ExternalLink, CheckCircle2, Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ScoreBreakdown = {
  skills_match: number;
  experience_relevance: number;
  education_fit: number;
  location_match: number;
  salary_alignment: number;
  work_setup_match: number;
  certifications_bonus: number;
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
  topReasons: string[];
  biasFlags: string[];
  aiSummary: string;
  computedAt: string;
  sentToEmployer: boolean;
};

type MatchReport = {
  job: { position_title: string; employers: { establishment_name: string } };
  scores: CandidateScore[];
  totalScored: number;
  lastComputedAt: string | null;
  sentToEmployer: boolean;
};

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  skills_match: "Skills",
  experience_relevance: "Experience",
  education_fit: "Education",
  location_match: "Location",
  salary_alignment: "Salary",
  work_setup_match: "Work Setup",
  certifications_bonus: "Certs",
};

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200" :
                              "text-rose-600 bg-rose-50 border-rose-200";
  const barColor = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl border ${color} min-w-[80px]`}>
      <span className="text-2xl font-black">{score}%</span>
      <div className="w-full h-1.5 bg-white/60 rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function MiniBreakdown({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 mt-2">
      {(Object.entries(breakdown) as [keyof ScoreBreakdown, number][]).map(([key, val]) => (
        <div key={key} className="text-center">
          <div className="text-[10px] text-slate-400 truncate">{BREAKDOWN_LABELS[key]}</div>
          <div className={`text-xs font-bold ${val >= 80 ? "text-emerald-600" : val >= 60 ? "text-amber-600" : "text-rose-500"}`}>
            {val}%
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full mt-0.5">
            <div
              className={`h-full rounded-full ${val >= 80 ? "bg-emerald-400" : val >= 60 ? "bg-amber-300" : "bg-rose-300"}`}
              style={{ width: `${val}%` }}
            />
          </div>
        </div>
      ))}
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

  const fetchReport = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/matching/${jobId}`);
    if (res.ok) {
      const data = await res.json() as MatchReport;
      setReport(data);
      setSent(data.sentToEmployer);
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  // Fetch employer ID for sending
  useEffect(() => {
    if (!jobId) return;
    void (async () => {
      const res = await fetch(`/api/admin/jobs/${jobId}/employer`);
      if (res.ok) {
        const data = await res.json() as { employerId?: string };
        if (data.employerId) setEmployerId(data.employerId);
      }
    })();
  }, [jobId]);

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

  const filteredScores = report?.scores.filter((s) => s.suitabilityScore >= minScore) ?? [];

  const jobTitle = report?.job?.position_title ?? "Loading...";
  const employerName = (report?.job?.employers as unknown as { establishment_name?: string })?.establishment_name ?? "";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/admin/matching">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600 mt-0.5">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h1 className="text-2xl font-bold text-slate-900">AI Suitability Report</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{jobTitle} — {employerName}</p>
            {report?.lastComputedAt && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                Last scored: {new Date(report.lastComputedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void runMatching()} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? "Running AI..." : "Re-run Matching"}
          </Button>
          {!sent ? (
            <Button
              size="sm"
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => void sendToEmployer()}
              disabled={sending || !report?.scores.length || !employerId}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Report to Employer
            </Button>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 gap-1.5 px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sent to Employer
            </Badge>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && report && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Scored", value: report.totalScored, color: "text-blue-700 bg-blue-50 border-blue-200" },
            { label: "High Match (80%+)", value: report.scores.filter((s) => s.suitabilityScore >= 80).length, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { label: "Medium (60–79%)", value: report.scores.filter((s) => s.suitabilityScore >= 60 && s.suitabilityScore < 80).length, color: "text-amber-700 bg-amber-50 border-amber-200" },
            { label: "Low (<60%)", value: report.scores.filter((s) => s.suitabilityScore < 60).length, color: "text-slate-700 bg-slate-50 border-slate-200" },
          ].map((stat) => (
            <Card key={stat.label} className={`p-4 border ${stat.color}`}>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-semibold text-slate-700">Min Score Threshold:</label>
        <div className="flex items-center gap-2">
          {[0, 50, 60, 70, 80].map((v) => (
            <button
              key={v}
              onClick={() => setMinScore(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                minScore === v ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
              }`}
            >
              {v === 0 ? "All" : `${v}%+`}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">Showing {filteredScores.length} candidates</span>
      </div>

      {/* Candidate list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : filteredScores.length === 0 ? (
        <Card className="p-16 text-center border border-dashed">
          <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">
            {report?.scores.length === 0 ? "No scores yet — run AI Matching to generate the report." : "No candidates match the selected threshold."}
          </p>
          {report?.scores.length === 0 && (
            <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => void runMatching()} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Run AI Matching Now
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredScores.map((candidate) => (
            <Card key={candidate.jobseekerId} className="p-5 hover:shadow-md transition-all group">
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${
                  candidate.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                  candidate.rank === 2 ? "bg-slate-100 text-slate-600" :
                  candidate.rank === 3 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"
                }`}>
                  #{candidate.rank}
                </div>

                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {candidate.name?.charAt(0)?.toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{candidate.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {candidate.nsrpId && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{candidate.nsrpId}</Badge>
                        )}
                        <Badge className={`text-[10px] py-0 px-1.5 ${
                          candidate.jobSeekingStatus === "actively_looking" ? "bg-emerald-100 text-emerald-700" :
                          candidate.jobSeekingStatus === "open" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {candidate.jobSeekingStatus === "actively_looking" ? "🟢 Active" :
                           candidate.jobSeekingStatus === "open" ? "🟡 Open" : "Not Looking"}
                        </Badge>
                      </div>
                    </div>
                    <ScoreGauge score={candidate.suitabilityScore} />
                  </div>

                  {/* AI Summary */}
                  <p className="text-xs text-slate-500 mt-2 italic">{candidate.aiSummary}</p>

                  {/* Top reasons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {candidate.topReasons?.map((r, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        ✓ {r}
                      </span>
                    ))}
                    {candidate.biasFlags?.map((f, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Info className="w-2.5 h-2.5" /> {f}
                      </span>
                    ))}
                  </div>

                  {/* Score breakdown */}
                  <MiniBreakdown breakdown={candidate.scoreBreakdown} />
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/profile/${candidate.nsrpId ?? candidate.jobseekerId}`} target="_blank">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs w-full">
                      <User className="w-3 h-3" /> View Profile
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </Button>
                  </Link>
                  <Link href={`/admin/messages?peerId=${candidate.jobseekerId}`}>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs w-full border-purple-200 text-purple-700 hover:bg-purple-50">
                      <MessageSquare className="w-3 h-3" /> Message
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
