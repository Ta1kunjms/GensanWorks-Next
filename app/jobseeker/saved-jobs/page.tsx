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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedJobs.map((job) => (
            <Card key={job.id} className="group relative overflow-hidden border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none mb-2">
                      {job.employmentType}
                    </Badge>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {job.positionTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                      <Building2 className="w-4 h-4" />
                      {job.establishmentName}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 -mt-2 -mr-2"
                    onClick={() => removeJob(job.id)}
                    disabled={removingId === job.id}
                  >
                    {removingId === job.id ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                      <BookmarkX className="w-5 h-5" />
                    )}
                  </Button>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {job.location}
                  </div>
                  {job.salaryMax && (
                    <div className="text-sm font-semibold text-emerald-600">
                      PHP {job.salaryMin} - {job.salaryMax}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    Saved on {new Date(job.savedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link href={`/jobseeker/jobs/${job.id}`} className="flex-1">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white group">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
