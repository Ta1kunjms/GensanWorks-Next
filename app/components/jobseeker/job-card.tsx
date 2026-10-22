"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Banknote, 
  Briefcase, 
  Clock, 
  Users, 
  Bookmark, 
  BookmarkCheck, 
  Share2 
} from "lucide-react";
import { formatRelativeTime } from "@/lib/time-utils";
import { toast } from "sonner";

export type Job = {
  id: string;
  positionTitle: string;
  city: string | null;
  province: string | null;
  employmentType: string;
  startingSalary: string | null;
  workType?: string | null;
  employerName: string | null;
  createdAt?: string | null;
  requiredSkills?: string[] | string | null;
  vacancies?: string | number | null;
  isSaved?: boolean;
};

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const [isSaved, setIsSaved] = useState(job.isSaved || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsSaving(true);
    const previousState = isSaved;
    setIsSaved(!previousState); // Optimistic update

    try {
      const response = await fetch(
        `/api/jobseeker/saved-jobs${!previousState ? "" : `?jobId=${job.id}`}`,
        {
          method: !previousState ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: !previousState ? JSON.stringify({ jobId: job.id }) : undefined,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update saved status");
      }

      toast.success(!previousState ? "Job saved!" : "Job removed from saved");
    } catch (error) {
      setIsSaved(previousState); // Rollback
      toast.error("Failed to update saved status. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/jobseeker/jobs/${job.id}`;
    const catchyMessage = `🚀 Hot Job Alert! Check out this opening for ${job.positionTitle} at ${job.employerName}. Find your next career move on GensanWorks! 💼✨\n\nApply here: ${url}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${job.positionTitle} | GensanWorks`,
          text: catchyMessage,
          url: url, // Keep URL for platforms that use it separately
        });
      } else {
        await navigator.clipboard.writeText(catchyMessage);
        toast.success("Catchy job link copied!");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        // Fallback to clipboard if share failed for reasons other than user cancellation
        await navigator.clipboard.writeText(catchyMessage);
        toast.success("Catchy job link copied!");
      }
      console.error("Error sharing:", error);
    }
  };

  const skills = (() => {
    if (!job.requiredSkills) return [];
    if (Array.isArray(job.requiredSkills)) return job.requiredSkills;
    if (typeof job.requiredSkills === "string") {
      try {
        const parsed = JSON.parse(job.requiredSkills);
        return Array.isArray(parsed) ? parsed : job.requiredSkills.split(",").map(s => s.trim());
      } catch {
        return job.requiredSkills.split(",").map(s => s.trim());
      }
    }
    return [];
  })();

  return (
    <div className="h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      {/* The title link is stretched over the card (after:absolute after:inset-0) so the whole
          card stays clickable while Save/Share sit outside the anchor (no nested interactives). */}
        <Card className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card p-4 transition-colors duration-200 hover:border-primary/40 hover:shadow-sm motion-reduce:transition-none sm:p-6">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
                  <Link
                    href={`/jobseeker/jobs/${job.id}`}
                    className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                  >
                    {job.positionTitle}
                  </Link>
                </h3>
                <p className="text-sm font-medium text-muted-foreground">{job.employerName}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="info" className="font-medium">
                  {job.employmentType}
                </Badge>
                {job.workType && (
                  <Badge variant="neutral" className="font-medium">
                    {job.workType}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 my-5">
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="line-clamp-1">{job.city}, {job.province}</span>
              </div>
              
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium text-slate-700">{job.startingSalary || "Salary Negotiable"}</span>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{job.vacancies || "1"} Vacanc{parseInt(String(job.vacancies || "1")) > 1 ? "ies" : "y"}</span>
              </div>

              {job.createdAt && (
                <div className="mt-1 flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Posted {formatRelativeTime(job.createdAt)}</span>
                </div>
              )}
            </div>
            
            {skills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-4">
                {skills.slice(0, 3).map((skill, i) => (
                  <span key={i} className="rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-slate-700">
                    {skill}
                  </span>
                ))}
                {skills.length > 3 && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    +{skills.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            {/* Visual call to action only; the stretched title link handles navigation. */}
            <Button asChild size="lg" className="flex-1 px-4">
              <span aria-hidden="true">
                <Briefcase className="h-4 w-4 mr-2" aria-hidden="true" />
                View & Apply
              </span>
            </Button>
            
            <Button 
              variant="outline"
              size="lg"
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`relative z-10 flex-1 px-4 ${
                isSaved 
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" 
                  : ""
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" aria-hidden="true" />
                  Save
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              size="icon"
              onClick={handleShare}
              aria-label={`Share ${job.positionTitle}`}
              className="relative z-10 h-11 w-11 shrink-0"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Card>
    </div>
  );
}
