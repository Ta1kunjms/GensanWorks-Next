"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Brain, Send, RefreshCw, Download, Loader2,
  Info, User, MessageSquare, ExternalLink, CheckCircle2, Clock,
  Building2, AlertTriangle, Zap, Target, TrendingUp,
  ThumbsUp, ThumbsDown, GraduationCap, Code, Sigma, Laptop, Brush, Layers, Search
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatScoreDerivation } from "@/lib/matching/score-explainer";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreDimension = {
  raw: number;
  weighted: number;
  weight_used?: number;
  confidence?: number;
};

type SkillExplanation = {
  top_contributing_skills?: string[];
  missing_critical_skills?: string[];
  score_breakdown?: Record<string, number>;
  bonus_skills?: string[];
  vague_skill_warnings?: string[];
  specificity_score?: number;
};

type CandidateScore = {
  rank: number;
  jobseekerId: string;
  name: string;
  email: string;
  nsrpId?: string;
  jobSeekingStatus: string;
  // Legacy + new calibrated scores
  suitabilityScore: number;       // raw 0–100 (old)
  final_score?: number;           // calibrated 0–100 (new)
  percentile_rank?: number;       // 0–1 (new)
  confidence_band?: "low" | "medium" | "high"; // (new)
  scoreBreakdown: Record<string, ScoreDimension | number>;
  explanation?: SkillExplanation;
  matchEvidence?: { rule: string; semantic: string; behavior: string; explanation?: SkillExplanation };
  topReasons: string[];
  biasFlags: string[];
  aiSummary: string;
  narrative?: string | null;      // NSRP 60–120 word HR narrative
  computedAt: string;
  sentToEmployer: boolean;
  skills?: string[];
  constraint_violations?: string[];
  strengths?: string[];
  gaps?: string[];
  dimensionScores?: Record<string, { raw: number; confidence: number; weighted: number }>;
};

type WorkHistoryEntry = {
  role_title: string;
  duration: string;
  relevance: "High" | "Medium" | "Low";
};

type MatchReport = {
  job: { 
    position_title: string; 
    required_skills?: string[];
    employers: { id: string; establishment_name: string } 
  };
  scores: CandidateScore[];
  totalScored: number;
  lastComputedAt: string | null;
  sentToEmployer: boolean;
};

const BREAKDOWN_LABELS: Record<string, string> = {
  skills_match: "Skills",
  experience_relevance: "Experience",
  education_fit: "Education",
  certifications_bonus: "Certs",
  f1: "Skills",
  f2: "Experience",
  f3: "Education",
  f6: "Completeness",
  f7: "Edu Relevance",
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

function InsightPanel({
  candidate,
  displayScore,
  onRegenerate,
  isRegenerating,
}: {
  candidate: CandidateScore;
  displayScore: number;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  // Prefer the new NSRP narrative, fall back to aiSummary
  const narrative = candidate.narrative || candidate.aiSummary || "";
  const strengths = candidate.strengths ?? candidate.topReasons ?? [];
  const concerns = candidate.gaps ?? [];

  const bandColor =
    displayScore >= 75
      ? "border-emerald-400 bg-emerald-50/40"
      : displayScore >= 60
      ? "border-amber-400 bg-amber-50/30"
      : displayScore >= 40
      ? "border-orange-400 bg-orange-50/30"
      : "border-rose-400 bg-rose-50/30";

  const quoteBorder =
    displayScore >= 75
      ? "border-l-emerald-500"
      : displayScore >= 60
      ? "border-l-amber-400"
      : displayScore >= 40
      ? "border-l-orange-400"
      : "border-l-rose-400";

  const quoteColor =
    displayScore >= 75
      ? "text-emerald-500/20"
      : displayScore >= 60
      ? "text-amber-400/30"
      : displayScore >= 40
      ? "text-orange-400/30"
      : "text-rose-400/30";

  return (
    <div className="space-y-3 pt-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Brain className="w-3 h-3" />
          AI Match Narrative
        </p>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
        >
          {isRegenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {narrative ? "Regenerate" : "Generate"}
        </button>
      </div>

      {narrative ? (
        <div className={`relative border-l-[3px] ${quoteBorder} ${bandColor} rounded-r-2xl p-5 pl-8 overflow-hidden`}>
          {/* Decorative quote mark */}
          <div className={`absolute top-2 left-2 ${quoteColor} text-5xl font-serif leading-none select-none`}>“</div>
          <p className="italic font-semibold text-slate-700 text-sm leading-relaxed relative pl-1">
            {narrative}
          </p>
          {/* AI model attribution */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
              NSRP · AI Narrative Engine
            </span>
          </div>
        </div>
      ) : (
        <div className="border-l-[3px] border-l-slate-200 bg-slate-50/50 rounded-r-2xl p-5 pl-8">
          <p className="text-sm text-slate-400 font-semibold italic">
            No narrative generated yet. Click &ldquo;Generate&rdquo; or run the matching engine.
          </p>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <ThumbsUp className="w-3 h-3" /> Strengths
          </p>
          <div className="flex flex-wrap gap-1.5">
            {strengths.slice(0, 5).map((s, i) => (
              <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Concerns — only show when score < 60 */}
      {concerns.length > 0 && displayScore < 60 && (
        <div>
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Growth Areas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {concerns.slice(0, 4).map((c, i) => (
              <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-bold text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Sub-Components ───────────────────────────────────────────────────────────

function ConfidencePip({ band }: { band?: "low" | "medium" | "high" }) {
  if (!band) return null;
  const config = {
    high:   { color: "bg-emerald-500", label: "High Confidence" },
    medium: { color: "bg-amber-400",   label: "Medium Confidence" },
    low:    { color: "bg-rose-400",    label: "Low Confidence" },
  }[band];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{config.label}</span>
    </div>
  );
}

function ScoreBadge({ score, finalScore, band }: { score: number; finalScore?: number; band?: "low" | "medium" | "high" }) {
  const display = finalScore ?? score;
  const colors: Record<string, string> = {
    Excellent: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Strong: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Good: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Fair: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    Weak: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  return (
    <div className={`px-4 py-3 rounded-2xl border ${colors} flex flex-col items-center justify-center min-w-[90px] gap-0.5`}>
      <span className="text-2xl font-black tabular-nums">{display.toFixed(1)}</span>
      <span className="text-[9px] uppercase tracking-widest font-bold opacity-70">/ 100</span>
      {finalScore !== undefined && (
        <span className="text-[8px] uppercase tracking-widest opacity-60 font-bold">Calibrated</span>
      )}
      <ConfidencePip band={band} />
    </div>
  );
}

function MiniBreakdown({ breakdown }: { breakdown: Record<string, ScoreDimension | number> | any }) {
  const validKeys = Object.keys(BREAKDOWN_LABELS);
  const entries = Object.entries(breakdown || {}).filter(([key]) => validKeys.includes(key));

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
      {entries.map(([key, val]) => {
        const rawVal = typeof val === "number" ? val : (val as any)?.raw ?? 0;
        const scoreVal = rawVal <= 1.0 && rawVal > 0 ? Math.round(rawVal * 1000) / 10 : Math.round(rawVal * 10) / 10;
        const label = BREAKDOWN_LABELS[key] || key;
        return (
          <div key={key} className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{label}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${scoreVal >= 80 ? "bg-emerald-500" : scoreVal >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                  style={{ width: `${scoreVal}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-700 w-8 text-right">{scoreVal.toFixed(1)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function truncateToSentences(text: string, count: number): string {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, count).join(" ").trim();
}

function SkillGroups({ explanation, allCandidateSkills, requiredSkills }: { explanation?: SkillExplanation; allCandidateSkills?: string[]; requiredSkills?: string[] }) {
  const matched = explanation?.top_contributing_skills || [];
  const missing = explanation?.missing_critical_skills || [];
  
  // Bonus skills: skills candidate has that are NOT in the required list
  const bonus = (allCandidateSkills || []).filter(s => 
    !matched.some(m => m.toLowerCase() === s.toLowerCase()) &&
    !(requiredSkills || []).some(r => r.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {matched.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Matched Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((s, i) => (
              <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {missing.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-rose-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Missing Critical
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((s, i) => (
              <Badge key={i} variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 font-bold text-[10px]">
                ✗ {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {bonus.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Bonus Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bonus.slice(0, 8).map((s, i) => (
              <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExperienceList({ breakdown, skills }: { breakdown: Record<string, any>; skills?: string[] }) {
  // Mocking history extraction since it's nested in dimension_scores in DB
  // In a real app, we'd fetch the deidentified work history directly.
  // For this UI refactor, we'll assume the engine passed relevant roles.
  const f2 = breakdown.f2;
  const raw = typeof f2 === "number" ? f2 : f2?.raw || 0;
  
  return (
    <div className="space-y-2 mt-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work History Relevance</p>
      <div className="space-y-1.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-800">Relevant Experience</p>
            <p className="text-[10px] text-slate-500 font-medium">Derived from profile history</p>
          </div>
          <Badge className={`${raw >= 0.7 ? "bg-emerald-100 text-emerald-700" : raw >= 0.4 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"} text-[9px] font-black uppercase`}>
            {raw >= 0.7 ? "High" : raw >= 0.4 ? "Medium" : "Low"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function EducationBadge({ score }: { score: number }) {
  return (
    <Badge className={`w-fit text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
      score >= 1.0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }`}>
      {score >= 1.0 ? "✅ Meets Requirement" : "⚠️ Below Requirement"}
    </Badge>
  );
}

// ─── Methodology Info Panel ──────────────────────────────────────────────────

function MethodologyInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          Scoring Methodology &amp; Weight Justification
        </span>
        <span className={`transform transition-transform ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && (
        <div className="px-5 py-4 text-xs text-slate-700 space-y-2 leading-relaxed border-t border-indigo-100">
          <p><strong>Weight Justification:</strong></p>
          <p>This system uses a weighted multi-criteria scoring model based on:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Singapore&apos;s MyCareersFuture (MCF)</strong> portal&apos;s matching methodology, which prioritizes skills (~45%) and experience (~28%) as primary factors.</li>
            <li><strong>ESCO</strong> (European Skills, Competences, Qualifications and Occupations) taxonomy for skill standardization — all skills in this system are mapped to ESCO URIs where available.</li>
            <li><strong>TESDA National Competency (NC)</strong> levels for Philippine context — skills with TESDA NC levels receive a +0.10 certification bonus (capped at +0.30).</li>
            <li><strong>F3 (Education)</strong> is intentionally weighted low (5–7%) to reduce credentialism bias — consistent with DOLE&apos;s skills-first hiring recommendations for the Philippine labor market.</li>
          </ul>
          <p className="mt-2"><strong>Bias Mitigation:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All demographic data (gender, age, region, education level) is stripped via <code>deidentifyJobseeker()</code> <em>before</em> scoring.</li>
            <li>Scores are computed only on: skills, experience, education match, and job description relevance.</li>
            <li>Post-hoc bias audit uses <strong>KS-test</strong> and <strong>Cohen&apos;s d</strong> to detect if any demographic group is systematically scored lower.</li>
          </ul>
          <p className="mt-2"><strong>Next enhancements:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Behavioral signals (clicks, saves, applications) are captured in <code>jobseeker_interactions</code> table. Will be incorporated into scoring after 14-day data collection period — currently shown as informational signal only.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Score Derivation Collapsible ───────────────────────────────────────────

function ScoreDerivationPanel({ candidate }: { candidate: CandidateScore }) {
  const [open, setOpen] = useState(false);
  const ds = (candidate.dimensionScores ?? candidate.scoreBreakdown ?? {}) as Record<string, { raw: number; confidence: number; weighted: number }>;
  const explanation = (candidate.explanation ?? candidate.matchEvidence?.explanation ?? null) as import("@/lib/matching/score-explainer").SkillExplanation | null;
  const weights: import("@/lib/matching/score-explainer").ScoringWeights = { f1: 0.40, f2: 0.25, f3: 0.05, f7: 0.10, f8: 0.20 };

  const derivation = formatScoreDerivation(ds, weights, explanation);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          How was this score calculated?
        </span>
        <span className={`text-slate-400 transform transition-transform ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-slate-100">
          <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
            {derivation}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── TF-IDF Term Details ─────────────────────────────────────────────────────

function TFIDFTermDetails({ explanation }: { explanation: SkillExplanation | undefined }) {
  const [open, setOpen] = useState(false);
  const breakdown = explanation?.score_breakdown;
  const missing = explanation?.missing_critical_skills;
  const warnings = explanation?.vague_skill_warnings;

  if (!breakdown || Object.keys(breakdown).length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors"
      >
        <span>TF-IDF Term Analysis</span>
        <span className={`transform transition-transform ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-3">
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Matched Terms (contribution %)</p>
            {Object.entries(breakdown)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([term, pct]) => {
                const isVague = warnings?.some(w => w.includes(`'${term}'`));
                return (
                  <div key={term} className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isVague ? 'text-amber-600' : 'text-slate-800'}`}>
                      {isVague ? '⚠' : '✓'} {term}
                    </span>
                    <span className="font-mono text-slate-500">{(pct * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
          {missing && missing.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Gap Terms (required but missing)</p>
              {missing.slice(0, 5).map((term, i) => (
                <div key={i} className="flex items-center text-xs text-rose-600">
                  ✗ {term}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 italic leading-relaxed">
            TF-IDF weights rare/specific skills higher than common ones. 
            A term like &ldquo;React&rdquo; scores higher than &ldquo;computer skills&rdquo; because it is 
            more discriminating across all job descriptions in the system.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMatchingReportPage() {
  const params = useParams<{ job_id: string }>();
  const jobId = params?.job_id;

  const [report, setReport] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
      if (data.job?.employers?.id) setEmployerId(data.job.employers.id);
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
        body: JSON.stringify({ jobId, jobseekerId }),
      });
      if (res.ok) {
        const narrative = await res.json();
        setReport(prev => {
          if (!prev) return null;
          return {
            ...prev,
            scores: prev.scores.map(s =>
              s.jobseekerId === jobseekerId ? { ...s, aiSummary: narrative.summary } : s
            ),
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
      body: JSON.stringify({ jobId, jobseekerId, signalType }),
    });
  };

  // Use final_score if available, fall back to suitabilityScore
  const getDisplayScore = (c: CandidateScore) => c.final_score ?? c.suitabilityScore;
  const filteredScores = (report?.scores ?? [])
    .filter(s => getDisplayScore(s) >= minScore)
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.nsrpId && s.nsrpId.toLowerCase().includes(q)) ||
        s.jobseekerId.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => getDisplayScore(b) - getDisplayScore(a));

  const jobTitle = report?.job?.position_title ?? "Loading...";
  const employerName = (report?.job?.employers as any)?.establishment_name ?? "";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
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
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <Brain className="w-3 h-3" /> Semantic Hybrid Ranking Engine · Calibrated Scores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-bold gap-2" onClick={() => void runMatching()} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? "Running..." : "Run Match"}
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

      {/* Summary Stats */}
      {!loading && report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Scored", value: report.totalScored, color: "text-slate-900", border: "border-slate-100" },
            { label: "High Match (80+)", value: report.scores.filter(s => getDisplayScore(s) >= 80).length, color: "text-emerald-700", border: "border-emerald-100 bg-emerald-50/30" },
            { label: "Medium Fit (60–79)", value: report.scores.filter(s => getDisplayScore(s) >= 60 && getDisplayScore(s) < 80).length, color: "text-amber-700", border: "border-amber-100 bg-amber-50/30" },
            { label: "Low Fit (<60)", value: report.scores.filter(s => getDisplayScore(s) < 60).length, color: "text-rose-700", border: "border-rose-100 bg-rose-50/30" },
          ].map(stat => (
            <Card key={stat.label} className={`p-6 rounded-3xl border ${stat.border} shadow-sm`}>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Methodology */}
      <MethodologyInfo />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Threshold */}
        <div className="flex items-center gap-6 bg-slate-50/50 p-2 rounded-[1.5rem] border border-slate-100 w-fit">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Filter Threshold</span>
          <div className="flex items-center gap-1">
            {[0, 50, 60, 70, 80].map(v => (
              <button
                key={v}
                onClick={() => setMinScore(v)}
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  minScore === v ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {v === 0 ? "All" : `${v}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search candidates by name, NSRP ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white font-medium text-sm placeholder:text-slate-400 focus-visible:ring-indigo-500/20 focus-visible:ring-4 focus-visible:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Candidate List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)}
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
          {filteredScores.map((candidate) => {
            const displayScore = getDisplayScore(candidate);
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
                              candidate.confidence_band === "high" ? "bg-emerald-500" :
                              candidate.confidence_band === "medium" ? "bg-amber-400" : "bg-rose-400"
                            }`} />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                              candidate.confidence_band === "high" ? "text-emerald-600" :
                              candidate.confidence_band === "medium" ? "text-amber-500" : "text-rose-500"
                            }`}>
                              {candidate.confidence_band === "high" ? "High Confidence" :
                               candidate.confidence_band === "medium" ? "Medium Confidence" : "Low Confidence"}
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
                          const f2 = candidate.scoreBreakdown?.f2 ?? (candidate.scoreBreakdown?.experience_relevance as any);
                          const rawExp = typeof f2 === "number" ? f2 : f2?.raw ?? 0.8;
                          const expRelevance = rawExp >= 0.7 ? "High" : rawExp >= 0.4 ? "Medium" : "Low";
                          const expColor = expRelevance === "High" ? "text-emerald-600" : expRelevance === "Medium" ? "text-amber-500" : "text-rose-500";

                          const f3 = candidate.scoreBreakdown?.f3 ?? (candidate.scoreBreakdown?.education_fit as any);
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

                    {/* AI Narrative Insight Panel */}
                    <InsightPanel
                      candidate={candidate}
                      displayScore={displayScore}
                      onRegenerate={() => void generateNarrative(candidate.jobseekerId)}
                      isRegenerating={narrativeLoading[candidate.jobseekerId] ?? false}
                    />

                    {/* Score Derivation + TF-IDF Details */}
                    <div className="space-y-3 pt-2">
                      <ScoreDerivationPanel candidate={candidate} />
                      <TFIDFTermDetails explanation={candidate.explanation} />
                    </div>
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
                    
                    <div className="w-full h-px bg-slate-100 my-1" />

                    <Link href={`/admin/applicants/${candidate.jobseekerId}`} className="w-full">
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
