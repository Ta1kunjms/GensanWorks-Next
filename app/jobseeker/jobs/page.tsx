"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, DollarSign, Briefcase, Filter, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/time-utils";
import { JobCard, type Job } from "@/components/jobseeker/job-card";

// Job type is now imported from JobCard component

function JobseekerJobsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get("search") || "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "salary">((searchParams?.get("sortBy") as any) || "date");
  const [typeFilter, setTypeFilter] = useState(searchParams?.get("type") || ""); // work setup: onsite/remote/hybrid
  const [workTypeFilter, setWorkTypeFilter] = useState(searchParams?.get("workType") || ""); // employment type: full-time/part-time/etc
  const [availableWorkTypes, setAvailableWorkTypes] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 10;

  const updateUrl = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams?.toString() || "");
    Object.entries(params).forEach(([key, value]) => {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    });
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const loadJobs = async (query: string, sort: string = "date", isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    
    try {
      const currentOffset = isLoadMore ? offset + LIMIT : 0;
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      if (typeFilter) params.append("type", typeFilter);
      if (workTypeFilter) params.append("workType", workTypeFilter);
      params.append("sortBy", sort === "salary" ? "salary_high" : "recent");
      params.append("limit", LIMIT.toString());
      params.append("offset", currentOffset.toString());

      const response = await fetch(
        `/api/jobs?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        if (!isLoadMore) setJobs([]);
        return;
      }

      const data = (await response.json()) as { data?: Job[], pagination?: { hasMore: boolean } };
      const newJobs = data.data ?? [];
      
      if (isLoadMore) {
        setJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id));
          const uniqueNew = newJobs.filter((j) => !existingIds.has(j.id));
          return [...prev, ...uniqueNew];
        });
        setOffset(currentOffset);
      } else {
        setJobs(newJobs);
        setOffset(0);
      }
      setHasMore(data.pagination?.hasMore ?? false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadJobs(q, sortBy);
    updateUrl({ 
      search: q || null, 
      sortBy: sortBy === "date" ? null : sortBy,
      type: typeFilter || null,
      workType: workTypeFilter || null
    });
  }, [sortBy, typeFilter, workTypeFilter]);

  // Fetch filter options once
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch("/api/jobs/filters");
        if (res.ok) {
          const data = await res.json();
          setAvailableWorkTypes(data.workTypes || []);
        }
      } catch (err) {
        console.error("Failed to fetch filters:", err);
      }
    };
    void fetchFilters();
  }, []);

  // Derived filters removed as we now fetch them from the API

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Browse Jobs</h2>
        <p className="text-sm text-slate-600">
          Search active opportunities and apply directly.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadJobs(q, sortBy);
            updateUrl({ search: q || null });
          }}
          className="flex gap-2"
        >
          <Input
            type="text"
            placeholder="Search by position, company, or skills..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Sort By
            </label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest</SelectItem>
                <SelectItem value="salary">Highest Salary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Work Setup
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All setups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All setups</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Work Type
            </label>
            <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All work types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All work types</SelectItem>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                {availableWorkTypes
                  .filter((t) => !["Full-time", "Part-time", "Contract", "Casual"].includes(t))
                  .map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setQ("");
                setTypeFilter("");
                setWorkTypeFilter("");
                setSortBy("date");
              }}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && !jobs.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center border border-dashed border-slate-300">
          <p className="text-slate-600 mb-4">No jobs found matching your criteria</p>
          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setTypeFilter("");
              setWorkTypeFilter("");
            }}
          >
            Clear filters and try again
          </Button>
        </Card>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => void loadJobs(q, sortBy, true)}
            disabled={loadingMore}
            className="w-full md:w-auto min-w-[200px]"
          >
            {loadingMore ? "Loading..." : "Load More Jobs"}
          </Button>
        </div>
      )}

      {jobs.length > 0 && (
        <p className="text-sm text-slate-600 text-center">
          Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

export default function JobseekerJobsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <JobseekerJobsContent />
    </Suspense>
  );
}
