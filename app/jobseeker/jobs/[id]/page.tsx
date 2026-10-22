"use client";
export const dynamic = "force-dynamic";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  Heart, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  ChevronLeft,
  Clock,
  Building2,
  FileText,
  Briefcase,
  Banknote,
  Users,
  GraduationCap,
  Award,
  Info,
  Tag,
  Layers,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { type JobDetailResponse } from "@/lib/job-detail";

type JobDetailApiResponse = JobDetailResponse & { error?: string };

function formatYearsOfExperience(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const count = Number(normalized);
    return `${count} ${count === 1 ? "year" : "years"}`;
  }

  return normalized;
}

function formatSalary(job: JobDetailResponse | null) {
  if (!job) {
    return "";
  }

  if (job.startingSalary) {
    return job.startingSalary;
  }

  return "Salary not disclosed";
}

function formatLocation(job: JobDetailResponse | null) {
  if (!job) {
    return "";
  }

  if (job.location?.trim()) {
    return job.location.trim();
  }

  return [job.city, job.province].filter(Boolean).join(", ") || "Location not specified";
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [job, setJob] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [expectedSalary, setExpectedSalary] = useState("");
  const [nsrpForwarded, setNsrpForwarded] = useState(true);
  const extraAttachments: string[] = [];
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const data = (await response.json()) as JobDetailApiResponse;

        if (!response.ok || !data.id) {
          setError(data.error ?? "Unable to load job details");
          setJob(null);
          return;
        }

        setJob(data);
        setHasApplied(data.hasApplied ?? false);
        setApplicationStatus(data.applicationStatus ?? null);
        setIsSaved(data.isSaved ?? false);
      } catch {
        setError("Unable to load job details");
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [jobId]);

  const toggleSave = async () => {
    if (!jobId || savingJob) return;
    
    setSavingJob(true);
    try {
      const method = isSaved ? "DELETE" : "POST";
      const url = isSaved ? `/api/jobseeker/saved-jobs?jobId=${jobId}` : "/api/jobseeker/saved-jobs";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: isSaved ? undefined : JSON.stringify({ jobId }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (err) {
      console.error("Failed to toggle save status", err);
    } finally {
      setSavingJob(false);
    }
  };

  const uploadResume = async (file: File) => {
    setUploadingResume(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/resume", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { error?: string; url?: string; message?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to upload resume");
        return;
      }

      setResumeUrl(data.url);
      setSuccess(data.message ?? "Resume uploaded. You can submit your application now.");
    } catch {
      setError("Unable to upload resume");
    } finally {
      setUploadingResume(false);
    }
  };

  const salaryText = useMemo(() => formatSalary(job), [job]);
  const locationText = useMemo(() => formatLocation(job), [job]);
  const postingDate = useMemo(() => {
    if (!job?.publishedAt) {
      return "Recent";
    }

    const date = new Date(job.publishedAt);
    if (Number.isNaN(date.getTime())) {
      return "Recent";
    }

    return date.toLocaleDateString();
  }, [job?.publishedAt]);

  const overviewItems = useMemo(
    () => [
      { label: "Salary", value: salaryText },
      { label: "Vacancies", value: job?.vacancies ? `${job.vacancies} opening${job.vacancies === 1 ? "" : "s"}` : "Not specified" },
      { label: "Work Type", value: job?.employmentType ?? "Not specified" },
      { label: "Location", value: locationText },
      { label: "Minimum Education", value: job?.minimumEducationRequired ?? "Not specified" },
      { label: "Main Skill", value: job?.mainSkillOrSpecialization ?? "Not specified" },
      { label: "Experience", value: formatYearsOfExperience(job?.yearsOfExperienceRequired) ?? "Not specified" },
      { label: "Category", value: job?.category ?? "Not specified" },
      { label: "PSOC Code", value: job?.psocCode ?? "Not specified" },
      { label: "Status", value: job?.jobStatus ?? "Not specified" },
      { label: "Slots Remaining", value: job?.slotsRemaining ?? "Not specified" },
      { label: "Featured", value: job?.featured ? "Yes" : "No" },
      { label: "Posted", value: postingDate },
    ],
    [job?.category, job?.employmentType, job?.featured, job?.jobStatus, job?.mainSkillOrSpecialization, job?.minimumEducationRequired, job?.psocCode, job?.slotsRemaining, job?.vacancies, job?.yearsOfExperienceRequired, locationText, postingDate, salaryText]
  );

  const submitApplication = async (event: FormEvent) => {
    event.preventDefault();
    if (!job) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
        const response = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coverLetter: coverLetter.trim() || undefined,
          resumeUrl: resumeUrl.trim() || undefined,
          expectedSalary: expectedSalary.trim() || undefined,
          nsrpForwarded,
          extraAttachments: extraAttachments.length > 0 ? extraAttachments : undefined,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string; application?: { status?: string } };
      if (!response.ok) {
        setError(data.error ?? "Unable to submit application");
        return;
      }

      setHasApplied(true);
      setApplicationStatus(data.application?.status ?? "pending");
      setSuccess(data.message ?? "Application submitted successfully");
      setShowSuccessModal(true);
    } catch {
      setError("Unable to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        {/* Header / Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600 hover:text-slate-900">
              <Link href="/jobseeker/jobs">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Back to Browse
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={`h-11 gap-2 sm:h-9 ${isSaved ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : "text-slate-600"}`}
              onClick={toggleSave}
              disabled={savingJob}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} aria-hidden="true" />
              {isSaved ? "Saved to My Jobs" : "Save Job"}
            </Button>
            <Button variant="outline" size="sm" className="h-11 gap-2 text-slate-600 sm:h-9">
              Report Job
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Job Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              {loading ? (
                <div className="p-4 sm:p-8 space-y-6" role="status" aria-label="Loading job details">
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : !job ? (
                <div className="p-6 sm:p-12 text-center">
                  <Alert variant="destructive" className="max-w-md mx-auto">
                    <AlertDescription>{error || "We couldn't find the job you're looking for."}</AlertDescription>
                  </Alert>
                  <Button asChild variant="link" className="mt-6">
                    <Link href="/jobseeker/jobs">Return to job listings</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-4 sm:p-8 md:p-10 border-b bg-card">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold" aria-hidden="true">
                        {job.employerName?.charAt(0) || "E"}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="info" className="px-3 py-0.5">
                            {job.employmentType ?? "Full-time"}
                          </Badge>
                          {job.startingSalary && (
                            <Badge variant="success" className="px-3 py-0.5">
                              Competitive Pay
                          </Badge>
                          )}
                          {job.featured && (
                            <Badge variant="warning" className="px-3 py-0.5">
                              Featured
                            </Badge>
                          )}
                        </div>
                        
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight break-words">
                          {job.positionTitle}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="font-semibold text-slate-700">{job.employerName ?? "Confidential Employer"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span>{locationText}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span>Posted {postingDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-8 md:p-10 space-y-10">
                    {/* Quick Summary Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Banknote className="w-4 h-4" aria-hidden="true" />
                          <span className="text-sm font-medium">Salary</span>
                        </div>
                        <p className="text-base sm:text-lg font-semibold text-slate-900 break-words">{salaryText}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Briefcase className="w-4 h-4" aria-hidden="true" />
                          <span className="text-sm font-medium">Experience</span>
                        </div>
                        <p className="text-base sm:text-lg font-semibold text-slate-900 break-words">{formatYearsOfExperience(job.yearsOfExperienceRequired) ?? "Not required"}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <GraduationCap className="w-4 h-4" aria-hidden="true" />
                          <span className="text-sm font-medium">Education</span>
                        </div>
                        <p className="text-base sm:text-lg font-semibold text-slate-900 truncate" title={job.minimumEducationRequired ?? "Open to all"}>
                          {job.minimumEducationRequired ?? "Open to all"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          <span className="text-sm font-medium">Vacancies</span>
                        </div>
                        <p className="text-base sm:text-lg font-semibold text-slate-900 break-words">{job.vacancies ? `${job.vacancies} open positions` : "Multiple"}</p>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Detailed Information Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Award className="w-5 h-5 text-slate-600" aria-hidden="true" />
                          <h2 className="text-lg font-semibold text-slate-900">Requirements & Skills</h2>
                        </div>
                        
                        <div className="space-y-5">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <Layers className="w-5 h-5 text-slate-600" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Main Skill / Specialization</p>
                              <p className="text-slate-900 font-semibold">{job.mainSkillOrSpecialization ?? "General Skills"}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <CheckCircle2 className="w-5 h-5 text-slate-600" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Minimum Education</p>
                              <p className="text-slate-900 font-semibold">{job.minimumEducationRequired ?? "No specific requirement"}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <CheckCircle2 className="w-5 h-5 text-slate-600" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Minimum Education</p>
                              <p className="text-slate-900 font-semibold">{job.minimumEducationRequired ?? "No specific requirement"}</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Info className="w-5 h-5 text-slate-600" aria-hidden="true" />
                          <h2 className="text-lg font-semibold text-slate-900">Job Classification</h2>
                        </div>

                        <div className="space-y-5">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <Tag className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Category</p>
                              <p className="text-slate-900 font-semibold">{job.category ?? "General"}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <Layers className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">PSOC Code</p>
                              <p className="text-slate-900 font-mono font-semibold">{job.psocCode ?? "N/A"}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <Info className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Status & Availability</p>
                              <p className="text-slate-900 font-semibold">
                                {job.jobStatus ?? "Open"} • {job.slotsRemaining ? `${job.slotsRemaining} slots left` : "Filling fast"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Right Column: Application Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              <Card className="p-4 sm:p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Apply for this position</h2>
                {(error || success) && (
                  <div className="space-y-3 mb-6">
                    {error && (
                      <Alert variant="destructive" className="border-red-100 bg-red-50 text-red-800 rounded-lg">
                        <AlertDescription className="font-medium">{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 rounded-lg">
                        <AlertDescription className="font-medium">{success}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : hasApplied ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Application Submitted</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Status: <span className="capitalize font-semibold">{applicationStatus}</span>
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="lg" className="w-full">
                      <Link href="/jobseeker/applications">View My Applications</Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submitApplication} className="space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="apply-cover-letter" className="text-sm font-semibold text-slate-700">Cover Letter (Recommended)</label>
                        <textarea
                          id="apply-cover-letter"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                          rows={6}
                          value={coverLetter}
                          onChange={(event) => setCoverLetter(event.target.value)}
                          placeholder="Explain why you're a great fit for this role..."
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Resume Attachment</label>
                        <div className="space-y-3">
                          {resumeUrl ? (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-700 truncate max-w-[150px]">
                                {resumeUrl.split('/').pop() || "Resume Attached"}
                              </span>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 text-blue-700"
                                onClick={() => setResumeUrl("")}
                              >
                                Change
                              </Button>
                            </div>
                          ) : (
                            <div className="relative group">
                              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 group-hover:bg-slate-100 group-hover:border-slate-400 group-focus-within:ring-2 group-focus-within:ring-ring transition-colors cursor-pointer">
                                <FileText className="w-8 h-8 text-muted-foreground mb-2" aria-hidden="true" />
                                <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF, DOC up to 10MB</p>
                              </div>
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                aria-label="Upload resume (PDF or DOC, up to 10MB)"
                                accept=".pdf,.doc,.docx"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) void uploadResume(file);
                                }}
                                disabled={uploadingResume}
                              />
                            </div>
                          )}
                          {uploadingResume && (
                            <div className="flex items-center gap-2 text-sm text-blue-700" role="status">
                              <Clock className="w-4 h-4" aria-hidden="true" />
                              Uploading resume...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="apply-expected-salary" className="text-sm font-semibold text-slate-700">Expected Salary (Optional)</label>
                        <Input
                          id="apply-expected-salary"
                          type="text"
                          placeholder="e.g. PHP 20,000 / month"
                          value={expectedSalary}
                          onChange={(e) => setExpectedSalary(e.target.value)}
                          className="w-full text-base"
                        />
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <input 
                          type="checkbox" 
                          id="nsrp-forward" 
                          className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          checked={nsrpForwarded}
                          onChange={(e) => setNsrpForwarded(e.target.checked)}
                        />
                        <div>
                          <label htmlFor="nsrp-forward" className="text-sm font-semibold text-slate-900 cursor-pointer">
                            Include My NSRP Profile
                          </label>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Attach your verified PESO Gensan NSRP Profile to give the employer a complete overview of your background.
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>
                    )}

                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full text-base font-semibold"
                      disabled={submitting || uploadingResume || !job}
                    >
                      {submitting ? "Submitting Application..." : "Send Application"}
                      {!submitting && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
                      By clicking send, you agree to share your profile and contact info with the employer.
                    </p>
                  </form>
                )}
              </Card>

              <Card className="p-4 sm:p-6 rounded-lg border shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 mb-4">About the Employer</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-muted border flex items-center justify-center font-semibold text-slate-700 text-lg" aria-hidden="true">
                      {job?.employerName?.charAt(0) || "E"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {job?.employerName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                        <p className="text-xs font-medium text-muted-foreground">Verified Establishment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md p-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center" aria-hidden="true">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-semibold text-slate-900">Application Sent!</DialogTitle>
              <DialogDescription className="text-muted-foreground leading-relaxed">
                Your application for <span className="text-slate-900 font-bold">{job?.positionTitle}</span> has been submitted successfully to <span className="text-slate-900 font-bold">{job?.employerName}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="w-full p-4 rounded-lg bg-blue-50 border border-blue-100 text-left">
              <p className="text-sm font-semibold text-blue-800 mb-1">What happens next?</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                A message thread has been automatically created. The employer can now review your profile and contact you directly via the messaging portal.
              </p>
            </div>

            <DialogFooter className="w-full sm:flex-col gap-2">
              <Button 
                size="lg"
                className="w-full"
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.href = "/jobseeker/messages";
                }}
              >
                Go to Messages
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                className="w-full"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
