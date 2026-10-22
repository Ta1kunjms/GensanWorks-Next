"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight, 
  Building2, 
  MapPin, 
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="space-y-6 text-sm">
      <PageHeader
        title="AI Suitability Matching"
        description={
          <>
            Match jobseekers with open positions using AI suitability scoring.{" "}
            <span className="font-medium">AI-assisted suggestion:</span> rankings help staff review candidates; people make every referral and hiring decision.
          </>
        }
        actions={
          <Button onClick={() => void fetchJobs()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {/* Filters & Search */}
      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input 
            placeholder="Search by job title or employer..." 
            className="pl-9 bg-slate-50 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Filter jobs">
          {(["all", "completed", "pending"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "outline"}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              <span className="capitalize">{f}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" aria-hidden="true" />}
          title="No jobs found"
          description={
            searchQuery
              ? "We couldn't find any jobs matching your search criteria."
              : "There are currently no active jobs available for matching."
          }
          action={
            searchQuery ? (
              <Button variant="link" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/matching/${job.id}`}
              className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="p-6 h-full hover:shadow-md transition-shadow border border-slate-200 group flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                    {job.position_title}
                  </h3>
                  
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Building2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <span className="font-medium truncate">{job.establishment_name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{job.city}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    {job.match_count > 0 ? "View Matches" : "Start Matching"}
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}