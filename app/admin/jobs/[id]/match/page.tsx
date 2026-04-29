"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  ChevronLeft, 
  RefreshCw, 
  Send, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Zap,
  TrendingUp,
  ShieldCheck,
  FileText
} from "lucide-react";

type CandidateScore = {
  jobseekerId: string;
  name: string;
  email: string;
  rank: number;
  utilityScore: number;
  grade: string;
  summary: string;
  computedAt: string;
};

type MatchingData = {
  job: {
    id: string;
    position_title: string;
    employer_id: string;
    establishment_name: string;
  };
  scores: CandidateScore[];
};

function GradeBadge({ grade }: { grade: string }) {
  const styles = {
    Excellent: "bg-emerald-100 text-emerald-700",
    Strong: "bg-blue-100 text-blue-700",
    Good: "bg-amber-100 text-amber-700",
    Fair: "bg-orange-100 text-orange-700",
    Weak: "bg-rose-100 text-rose-700",
  };
  return (
    <Badge variant="outline" className={`font-bold ${styles[grade as keyof typeof styles] ?? "bg-slate-100 text-slate-600"}`}>
      {grade}
    </Badge>
  );
}

export default function JobMatchingDashboard() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;
  const { toast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<MatchingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/matching/${jobId}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const runMatching = async () => {
    if (!jobId) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/admin/matching/${jobId}`, { method: "POST" });
      const result = await res.json();
      
      if (res.ok) {
        toast({
          title: "Matching Complete",
          description: `Successfully scored ${result.scored} candidates using AI.`,
        });
        await loadData();
      } else {
        toast({
          title: "Matching Failed",
          description: result.error || "An error occurred during matching.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to connect to matching engine.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const sendToEmployer = async () => {
    if (!jobId || !data?.job.employer_id) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/matching/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employerId: data.job.employer_id }),
      });
      
      if (res.ok) {
        toast({
          title: "Report Sent",
          description: "Candidate suitability report is now visible to the employer.",
        });
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to send report");
      }
    } catch (e: any) {
      toast({
        title: "Failed to send",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-8 h-[600px] rounded-3xl" />
          <Skeleton className="col-span-4 h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  const jobTitle = data?.job?.position_title ?? "Job Not Found";
  const employerName = data?.job?.establishment_name ?? "Unknown Employer";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/admin/jobs">
            <Button variant="ghost" size="icon" className="rounded-full mt-1">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Matching Dashboard</h1>
            </div>
            <p className="text-slate-500 font-medium ml-12">
              {jobTitle} <span className="text-slate-300 mx-2">|</span> {employerName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => void loadData()} 
            disabled={loading || running}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            onClick={runMatching} 
            disabled={running}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100"
          >
            <Zap className={`w-4 h-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            {running ? "Analyzing Candidates..." : "Run AI Matching"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-4">
          <Card className="rounded-3xl border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Matched Candidates</CardTitle>
                  <CardDescription>Ranked by AI utility score across 5 dimensions.</CardDescription>
                </div>
                {data?.scores && data.scores.length > 0 && (
                  <Badge variant="secondary" className="font-bold">
                    {data.scores.length} Candidates Scored
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.scores || data.scores.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No scores yet</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
                    Click "Run AI Matching" to analyze active jobseekers against this vacancy.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.scores.map((score) => (
                    <div key={score.jobseekerId} className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm ${
                        score.rank === 1 ? "bg-yellow-400 text-white" :
                        score.rank === 2 ? "bg-slate-300 text-slate-700" :
                        score.rank === 3 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        #{score.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{score.name}</h4>
                            <p className="text-xs text-slate-500">{score.email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900 leading-none">{Math.round(score.utilityScore)}%</div>
                            <GradeBadge grade={score.grade} />
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2 italic">
                          &ldquo;{score.summary}&rdquo;
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> Profile Valid</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> De-identified</span>
                          <span>Scored {new Date(score.computedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link href={`/profile/${score.jobseekerId}`} target="_blank">
                        <Button variant="ghost" size="icon" className="rounded-xl">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                < Zap className="w-5 h-5" /> Matching Engine
              </h3>
              <p className="text-indigo-100 text-sm mt-1">Utility Model v3 (Llama 3.3 70B)</p>
              
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-end border-b border-white/20 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Skill Weight</span>
                  <span className="font-black">35%</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/20 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Experience</span>
                  <span className="font-black">25%</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/20 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">QPE Override</span>
                  <span className="font-black">Active</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-6 space-y-4 shadow-xl shadow-slate-100">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">Finalize Matching</h3>
              <p className="text-sm text-slate-500">
                Once satisfied with the AI scores, send the report to the employer. This will enable the "Intelligent Matching" tab in their dashboard.
              </p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Sending this report will allow the employer to see de-identified scores and summaries for these candidates.
              </p>
            </div>

            <Button 
              className="w-full h-12 rounded-2xl bg-slate-950 hover:bg-black text-white font-bold"
              disabled={!data?.scores || data.scores.length === 0 || sending}
              onClick={sendToEmployer}
            >
              {sending ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              {sending ? "Sending..." : "Send to Employer"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Audit Logged
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}