"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Heart, 
  MapPin, 
  Building2, 
  Clock, 
  ArrowRight, 
  Search,
  BookmarkX
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard, type Job } from "@/components/jobseeker/job-card";

type SavedJob = {
  savedId: string;
  savedAt: string;
  id: string;
  positionTitle: string;
  establishmentName: string;
  location: string;
  employmentType: string;
  startingSalary: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
};

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        const response = await fetch("/api/jobseeker/saved-jobs");
        const data = await response.json();
        if (response.ok) {
          setSavedJobs(data.savedJobs || []);
        }
      } catch (err) {
        console.error("Failed to load saved jobs", err);
      } finally {
        setLoading(false);
      }
    };

    void loadSavedJobs();
  }, []);

  const removeJob = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      const response = await fetch(`/api/jobseeker/saved-jobs?jobId=${jobId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      console.error("Failed to remove job", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Saved Jobs</h1>
          <p className="text-slate-500 mt-1">Keep track of opportunities you're interested in.</p>
        </div>
        <Link href="/jobseeker/jobs">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Search className="w-4 h-4 mr-2" />
            Browse More Jobs
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : savedJobs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No saved jobs yet</h3>
            <p className="text-slate-500">
              When you find a job you like, click the heart icon to save it for later.
            </p>
            <Link href="/jobseeker/jobs" className="inline-block mt-4">
              <Button variant="outline">Browse Job Listings</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedJobs.map((job) => {
            const [city, province] = job.location.split(", ");
            const mappedJob: Job = {
              id: job.id,
              positionTitle: job.positionTitle,
              employerName: job.establishmentName,
              employmentType: job.employmentType,
              city: city || null,
              province: province || null,
              startingSalary: job.startingSalary || (job.salaryMin ? `${job.salaryMin} - ${job.salaryMax}` : null),
              isSaved: true,
              createdAt: job.savedAt, // Using savedAt as a proxy if createdAt not available
            };
            return <JobCard key={job.id} job={mappedJob} />;
          })}
        </div>
      )}
    </div>
  );
}
