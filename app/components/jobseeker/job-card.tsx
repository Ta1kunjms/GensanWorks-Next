"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Clock, 
  Users, 
  Bookmark, 
  BookmarkCheck, 
  Share2 
} from "lucide-react";
import { formatRelativeTime } from "@/lib/time-utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/jobseeker/jobs/${job.id}`}>
        <Card className="group relative overflow-hidden p-6 h-full flex flex-col bg-white/50 backdrop-blur-sm border-slate-200/60 hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
          {/* Background Decorative Gradient */}
          <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl transition-all group-hover:bg-blue-500/10" />
          
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-lg text-slate-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {job.positionTitle}
                </h3>
                <p className="text-sm font-medium text-slate-500">{job.employerName}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                  {job.employmentType}
                </Badge>
                {job.workType && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                    {job.workType}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 my-5">
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="line-clamp-1">{job.city}, {job.province}</span>
              </div>
              
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="font-medium text-slate-700">{job.startingSalary || "Salary Negotiable"}</span>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <Users className="h-4 w-4" />
                </div>
                <span>{job.vacancies || "1"} Vacanc{parseInt(String(job.vacancies || "1")) > 1 ? "ies" : "y"}</span>
              </div>

              {job.createdAt && (
                <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Posted {formatRelativeTime(job.createdAt)}</span>
                </div>
              )}
            </div>
            
            {skills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-4">
                {skills.slice(0, 3).map((skill, i) => (
                  <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                    {skill}
                  </span>
                ))}
                {skills.length > 3 && (
                  <span className="text-[10px] font-medium text-slate-400 ml-1">
                    +{skills.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <Button 
              className="flex-1 h-10 bg-slate-900 hover:bg-blue-600 text-white font-semibold transition-all duration-300 shadow-sm hover:shadow-blue-200"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              View & Apply
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`flex-1 h-10 font-semibold transition-all duration-300 ${
                isSaved 
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" 
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 shrink-0 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
