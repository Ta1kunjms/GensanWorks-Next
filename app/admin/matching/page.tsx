export const dynamic = "force-dynamic";
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Brain, 
  Search, 
  ArrowRight, 
  Building2, 
  MapPin, 
  Users, 
  Clock,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type JobMatchSummary = {
  id: string;
  position_title: string;
  establishment_name: string;
  city: string;
  created_at: string;
  match_count: number;
  last_computed_at: string | null;
  sent_to_employer: boolean;
};

export default function AdminMatchingIndexPage() {
  const [jobs, setJobs] = useState<JobMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/matching/jobs");
      if (res.ok) {
        const data = await res.json() as { jobs?: JobMatchSummary[] };
        setJobs(data.jobs ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch matching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.position_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.establishment_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === "completed") return matchesSearch && job.match_count > 0;
    if (filter === "pending") return matchesSearch && job.match_count === 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">AI Suitability Matching</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Match jobseekers with open positions using AI suitability scoring.
          </p>
        </div>
        <Button onClick={() => void fetchJobs()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by job title or employer..." 
            className="pl-9 bg-slate-50 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "completed", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                filter === f 
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="capitalize">{f}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="p-16 text-center border-dashed">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No jobs found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery 
              ? "We couldn't find any jobs matching your search criteria." 
              : "There are currently no active jobs available for matching."}
          </p>
          {searchQuery && (
            <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-purple-600">
              Clear search
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <Link key={job.id} href={`/admin/matching/${job.id}`}>
              <Card className="p-5 h-full hover:shadow-lg transition-all border border-slate-200 group flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={job.match_count > 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"}>
                      {job.match_count > 0 ? "Scored" : "Pending AI"}
                    </Badge>
                    {job.sent_to_employer && (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">
                        Sent
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                    {job.position_title}
                  </h3>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{job.establishment_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{job.city}</span>
                    </div>
                  </div>

                  {job.match_count > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{job.match_count} Matches</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(job.last_computed_at!).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="text-xs font-semibold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {job.match_count > 0 ? "View Report" : "Start Matching"}
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}