export const dynamic = "force-dynamic";
"use client";

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
  aiSummary: string;
  computedAt: string;
};

type EmployerMatchReport = {
  job: { position_title: string };
  scores: CandidateScore[];
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
          <div className="text-[10px] text-slate-400 truncate">{BREAKDOWN_LABELS[key as keyof ScoreBreakdown]}</div>
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/employer/jobs/${jobId}`}>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600 mt-0.5">
            <ChevronLeft className="w-4 h-4" /> Back to Job
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">AI Suitability Report</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{jobTitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : !report?.scores || report.scores.length === 0 ? (
        <Card className="p-16 text-center border border-dashed">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No matching report available yet.</p>
          <p className="text-sm text-slate-500 mt-1">PESO Gensan is still processing the AI matching for this job.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-purple-50 text-purple-800 text-sm rounded-xl border border-purple-100 flex items-start gap-3">
             <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
             <div>
               <p className="font-semibold">PESO AI Recommendations</p>
               <p className="text-purple-700/80 mt-0.5">These candidates have been matched against your job requirements based on their skills and experience. You can view their full profiles or message them directly.</p>
             </div>
          </div>
          {report.scores.map((candidate) => (
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
                  <p className="text-xs text-slate-500 mt-2 italic">&ldquo;{candidate.aiSummary}&rdquo;</p>

                  {/* Top reasons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {candidate.topReasons?.map((r, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                        ✓ {r}
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
                  <Link href={`/employer/messages?peerId=${candidate.jobseekerId}`}>
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
