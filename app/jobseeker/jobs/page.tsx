"use client";

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
import { Search, MapPin, DollarSign, Briefcase, Filter } from "lucide-react";

type Job = {
  id: string;
  positionTitle: string;
  city: string | null;
  province: string | null;
  employmentType: string;
  startingSalary: string | null;
  employerName: string | null;
  createdAt?: string | null;
};

function JobseekerJobsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get("search") || "");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "salary" | "relevance">((searchParams?.get("sortBy") as any) || "date");
  const [locationFilter, setLocationFilter] = useState(searchParams?.get("location") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams?.get("type") || "");
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
      if (locationFilter) params.append("location", locationFilter);
      if (typeFilter) params.append("type", typeFilter);
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
        setJobs(prev => [...prev, ...newJobs]);
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
      location: locationFilter || null,
      type: typeFilter || null
    });
  }, [sortBy, locationFilter, typeFilter]);

  const uniqueLocations = useMemo(
    () =>
      Array.from(
        new Set(
          jobs
            .map((j) => j.city || j.province)
            .filter(Boolean)
        )
      ).sort(),
    [jobs]
  );

  const uniqueTypes = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.employmentType).filter(Boolean))).sort(),
    [jobs]
  );

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
                <SelectItem value="relevance">Relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Location
            </label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All locations</SelectItem>
                {uniqueLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Employment Type
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {uniqueTypes.map((type) => (
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
                setLocationFilter("");
                setTypeFilter("");
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobseeker/jobs/${job.id}`}>
              <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-300 cursor-pointer h-full flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">
                      {job.positionTitle}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {job.employmentType}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-600 mb-1">{job.employerName}</p>

                  <div className="space-y-2 text-sm text-slate-600 my-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{job.city}, {job.province}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span>{job.startingSalary || "Not specified"}</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4">
                  <Briefcase className="h-4 w-4 mr-2" />
                  View & Apply
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center border border-dashed border-slate-300">
          <p className="text-slate-600 mb-4">No jobs found matching your criteria</p>
          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setLocationFilter("");
              setTypeFilter("");
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
