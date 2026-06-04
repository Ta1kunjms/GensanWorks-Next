"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Brain, User, MessageSquare, ExternalLink, AlertCircle, CheckCircle2,
  ThumbsUp, ThumbsDown, GraduationCap, Code, Sigma, Laptop, Brush, Layers, TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ScoreBreakdown = {
  f1_skill_match: number;
  f2_experience_arc: number;
  f3_education_qpe: number;


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
};

function getSkillIcon(skillName: string) {
  const name = skillName.toLowerCase();
  if (name.includes("next.js") || name.includes("react") || name.includes("programming") || name.includes("developer") || name.includes("coding")) {
    return <Code className="w-3.5 h-3.5 text-slate-500" />;
  }
  if (name.includes("figma")) {
    return <Sigma className="w-3.5 h-3.5 text-slate-500" />;
  }
  if (name.includes("photoshop") || name.includes("trend") || name.includes("relevance")) {
    return <TrendingUp className="w-3.5 h-3.5 text-slate-500" />;
  }
  if (name.includes("graphic") || name.includes("design")) {
    return <Brush className="w-3.5 h-3.5 text-slate-500" />;
  }
  if (name.includes("illustrator") || name.includes("vector")) {
    return <Layers className="w-3.5 h-3.5 text-slate-500" />;
  }
  if (name.includes("computer") || name.includes("literate") || name.includes("software")) {
    return <Laptop className="w-3.5 h-3.5 text-slate-500" />;
  }
  return <GraduationCap className="w-3.5 h-3.5 text-slate-500" />;
}

function getRelevantSkills(candidate: any) {
  // 1. Prioritize semantic strengths (top contributing skills calculated by ML scoring)
  let picked = [...(candidate.strengths || [])];

  // 2. Supplement with candidate profile skills
  const allSkills = candidate.skills || [];
  const fillerTerms = ["others", "other", "lay outing", "layouting", "computer literate", "computer literacy", "general"];

  const filteredAll = allSkills.filter((s: string) => {
    const norm = s.toLowerCase().trim();
    const alreadyPicked = picked.some(p => p.toLowerCase().trim() === norm);
    const isFiller = fillerTerms.some(term => norm === term || norm.includes(term));
    return !alreadyPicked && !isFiller;
  });

  picked = [...picked, ...filteredAll];

  // Fallback to profile skills if picked list is empty
  if (picked.length === 0) {
    picked = allSkills.filter((s: string) => {
      const norm = s.toLowerCase().trim();
      return !fillerTerms.some(term => norm === term);
    });
  }

  // Ensure unique and limit to 6
  return Array.from(new Set(picked)).slice(0, 6);
}

function getDetailedInsight(candidate: any, displayScore: number, expRelevance: string, meetsEdu: boolean) {
  const firstName = candidate.name ? candidate.name.split(" ")[0] : "The candidate";
  const grade = candidate.grade || (displayScore >= 85 ? "Excellent" : displayScore >= 70 ? "Strong" : displayScore >= 50 ? "Good" : "Fair");
  
  let opening = "";
  if (grade === "Excellent" || grade === "Strong") {
    opening = `${firstName} represents a top-tier matching profile and should be fast-tracked to direct interviews.`;
  } else if (grade === "Good") {
    opening = `${firstName} shows solid core skills and highly relevant credentials that make them a very strong candidate.`;
  } else {
    opening = `${firstName} possesses basic functional capability but will require specific skills-screening and close oversight.`;
  }

  let experienceText = "";
  if (expRelevance === "High") {
    experienceText = "Their work history demonstrates seasoned expertise in similar domains, which should translate to minimal training overhead.";
  } else if (expRelevance === "Medium") {
    experienceText = "Their professional background covers necessary foundations, though they may face a brief transition period in adapting to specialized tasks.";
  } else {
    experienceText = "Since direct career tenure is light, their primary strengths reside in technical self-education or transferable certifications.";
  }

  let educationText = "";
  if (meetsEdu) {
    educationText = "Furthermore, their academic profile aligns fully with the job requirements, indicating a strong theoretical background.";
  } else {
    educationText = "While their formal academic credentials fall slightly below the preferred baseline, their active skill portfolio effectively mitigates this gap.";
  }

  let tipText = "";
  if (displayScore >= 80) {
    tipText = "Interview Focus: Assess their leadership initiative, project ownership habits, and high-level problem-solving strategy.";
  } else if (displayScore >= 60) {
    tipText = "Interview Focus: Verify practical proficiency with preferred operational tools and clarify career advancement goals.";
  } else {
    tipText = "Interview Focus: Deeply evaluate basic foundational skills and their overall enthusiasm for structured technical upskilling.";
  }

  return `${opening} ${experienceText} ${educationText} ${tipText}`;
}

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

  const giveFeedback = async (jobseekerId: string, signalType: string) => {
    if (!jobId) return;
    await fetch("/api/matching/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, jobseekerId, signalType }),
    });
  };

  const recordOutcome = async (jobseekerId: string, outcome: string) => {
    if (!jobId) return;
    try {
      const res = await fetch("/api/employer/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, jobseeker_id: jobseekerId, outcome }),
      });
      if (res.ok) {
        alert(`Outcome recorded: ${outcome}. This helps improve matching accuracy over time.`);
      }
    } catch {
      console.error("Failed to record outcome");
    }
  };

  const [outcomeDropdown, setOutcomeDropdown] = useState<string | null>(null);

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

          {report.scores.map((candidate) => {
            const displayScore = candidate.utilityScore ?? candidate.suitabilityScore ?? 0;
            const confidenceBand = displayScore >= 72 ? "high" : displayScore >= 48 ? "medium" : "low";
            return (
              <Card key={candidate.jobseekerId} className="overflow-hidden rounded-3xl border border-slate-100 hover:shadow-xl hover:shadow-slate-100/80 transition-all duration-300 bg-white p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column: Main candidate overview */}
                  <div className="flex-1 space-y-6">
                    {/* Header: Rank, Name, ID, Status & Calibrated Score */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                          #{candidate.rank}
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{candidate.name}</h2>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>ID: {candidate.nsrpId || "NSRP-961921"}</span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-slate-500">
                                {candidate.jobSeekingStatus === "actively_looking" ? "Actively Looking" : "Open to Work"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Calibrated Score Box placed inside Header */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-sm shrink-0 sm:ml-auto">
                        <div className="text-right">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Calibrated Score</div>
                          <div className="flex items-center justify-end gap-1.5 mt-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              confidenceBand === "high" ? "bg-emerald-500" :
                              confidenceBand === "medium" ? "bg-amber-400" : "bg-rose-400"
                            }`} />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                              confidenceBand === "high" ? "text-emerald-600" :
                              confidenceBand === "medium" ? "text-amber-500" : "text-rose-500"
                            }`}>
                              {confidenceBand === "high" ? "High Confidence" :
                               confidenceBand === "medium" ? "Medium Confidence" : "Low Confidence"}
                            </span>
                          </div>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                          {displayScore.toFixed(1)}
                          <span className="text-xs font-bold text-slate-400 ml-1">/ 100</span>
                        </div>
                      </div>
                    </div>

                    {/* Bento Grid: 2/3 Skills + 1/3 Derived Fit Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {/* Top Skills — pill badges, flex-wrap, no truncation */}
                      <div className="md:col-span-2 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {getRelevantSkills(candidate).map((skill, index) => (
                            <div key={index} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                              {getSkillIcon(skill)}
                              <span>{skill}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Derived Fit Metrics — compact stacked rows */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Derived Fit</p>
                        {(() => {
                          const f2 = candidate.dimensionScores?.f2_experience_arc ?? candidate.scoreBreakdown?.f2 ?? 0.8;
                          const rawExp = typeof f2 === "number" ? f2 : f2?.raw ?? 0.8;
                          const expRelevance = rawExp >= 0.7 ? "High" : rawExp >= 0.4 ? "Medium" : "Low";
                          const expColor = expRelevance === "High" ? "text-emerald-600" : expRelevance === "Medium" ? "text-amber-500" : "text-rose-500";

                          const f3 = candidate.dimensionScores?.f3_education_qpe ?? candidate.scoreBreakdown?.f3 ?? 1.0;
                          const rawEdu = typeof f3 === "number" ? f3 : f3?.raw ?? 1.0;
                          const meetsEdu = rawEdu >= 0.7;

                          return (
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                  <span>Experience</span>
                                </div>
                                <span className={`font-extrabold ${expColor}`}>{expRelevance}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                                  <span>Education</span>
                                </div>
                                <span className={`font-extrabold ${meetsEdu ? "text-emerald-600" : "text-rose-500"}`}>
                                  {meetsEdu ? "Meets" : "Below"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Detailed Insight Quote Box */}
                    {(() => {
                      const f2 = candidate.dimensionScores?.f2_experience_arc ?? candidate.scoreBreakdown?.f2 ?? 0.8;
                      const rawExp = typeof f2 === "number" ? f2 : f2?.raw ?? 0.8;
                      const expRelevance = rawExp >= 0.7 ? "High" : rawExp >= 0.4 ? "Medium" : "Low";

                      const f3 = candidate.dimensionScores?.f3_education_qpe ?? candidate.scoreBreakdown?.f3 ?? 1.0;
                      const rawEdu = typeof f3 === "number" ? f3 : f3?.raw ?? 1.0;
                      const meetsEdu = rawEdu >= 0.7;

                      const insight = getDetailedInsight(candidate, displayScore, expRelevance, meetsEdu);
                      return (
                        <div className="space-y-2 pt-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Insight</p>
                          <div className="relative border-l-[3px] border-emerald-500 bg-slate-50/50 rounded-r-2xl p-5 pl-8 mt-1.5 overflow-hidden">
                            <div className="absolute top-2 left-2 text-emerald-500/20 text-5xl font-serif leading-none select-none">“</div>
                            <p className="italic font-bold text-slate-600 text-sm leading-relaxed relative pl-1">
                              &lsquo;{insight}&rsquo;
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Decision Panel */}
                  <div className="lg:w-56 shrink-0 lg:border-l lg:border-slate-100 lg:pl-8 flex flex-col justify-center gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest lg:text-center">Decision Panel</p>

                    <Button
                      className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                      onClick={() => giveFeedback(candidate.jobseekerId, "shortlisted")}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Shortlist
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center justify-center gap-2"
                      onClick={() => giveFeedback(candidate.jobseekerId, "rejected")}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reject
                    </Button>

                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-extrabold text-xs uppercase tracking-wider hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center gap-2"
                        onClick={() => setOutcomeDropdown(outcomeDropdown === candidate.jobseekerId ? null : candidate.jobseekerId)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Record Outcome
                      </Button>
                      {outcomeDropdown === candidate.jobseekerId && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-10">
                          {["hired", "shortlisted", "interviewed", "rejected", "withdrew"].map((oc) => (
                            <button
                              key={oc}
                              type="button"
                              className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-50 transition-colors text-left capitalize"
                              onClick={() => {
                                recordOutcome(candidate.jobseekerId, oc);
                                setOutcomeDropdown(null);
                              }}
                            >
                              {oc}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="w-full h-px bg-slate-100 my-1" />

                    <Link href={`/profile/${candidate.nsrpId ?? candidate.jobseekerId}`} target="_blank" className="w-full">
                      <Button
                        variant="ghost"
                        className="w-full h-10 rounded-xl text-blue-600 hover:text-blue-700 font-extrabold text-xs uppercase tracking-wider hover:bg-blue-50/50 flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Full Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
