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
  DollarSign,
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
      { label: "Age Preference", value: job?.agePreferenceMin || job?.agePreferenceMax ? `${job.agePreferenceMin ?? "Any"} - ${job.agePreferenceMax ?? "Any"}` : "Not specified" },
      { label: "Category", value: job?.category ?? "Not specified" },
      { label: "PSOC Code", value: job?.psocCode ?? "Not specified" },
      { label: "Status", value: job?.jobStatus ?? "Not specified" },
      { label: "Slots Remaining", value: job?.slotsRemaining ?? "Not specified" },
      { label: "Featured", value: job?.featured ? "Yes" : "No" },
      { label: "Posted", value: postingDate },
    ],
    [job?.agePreferenceMax, job?.agePreferenceMin, job?.category, job?.employmentType, job?.featured, job?.jobStatus, job?.mainSkillOrSpecialization, job?.minimumEducationRequired, job?.psocCode, job?.slotsRemaining, job?.vacancies, job?.yearsOfExperienceRequired, locationText, postingDate, salaryText]
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
    } catch {
      setError("Unable to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/jobseeker/jobs">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600 hover:text-slate-900">
              <ChevronLeft className="w-4 h-4" />
              Back to Browse
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-2 transition-all ${isSaved ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : "text-slate-600"}`}
            onClick={toggleSave}
            disabled={savingJob}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved to My Jobs" : "Save Job"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-slate-600">
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
              <div className="p-8 space-y-6">
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
              <div className="p-12 text-center">
                <Alert variant="destructive" className="max-w-md mx-auto">
                  <AlertDescription>{error || "We couldn't find the job you're looking for."}</AlertDescription>
                </Alert>
                <Link href="/jobseeker/jobs" className="mt-6 block">
                  <Button variant="link">Return to job listings</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="p-8 md:p-10 border-b border-slate-100 bg-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
                  
                  <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-100">
                      {job.employerName?.charAt(0) || "E"}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 font-semibold px-3 py-0.5">
                          {job.employmentType ?? "Full-time"}
                        </Badge>
                        {job.startingSalary && (
                          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-100 font-semibold px-3 py-0.5">
                            Competitive Pay
                          </Badge>
                        )}
                        {job.featured && (
                          <Badge variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-100 font-semibold px-3 py-0.5">
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {job.positionTitle}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-slate-500">
                        <div className="flex items-center gap-2 group">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                          </div>
                          <span className="font-semibold text-slate-700">{job.employerName ?? "Confidential Employer"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-slate-400" />
                          </div>
                          <span>{locationText}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-slate-400" />
                          </div>
                          <span>Posted {postingDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 space-y-12">
                  {/* Quick Summary Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Salary</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{salaryText}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Experience</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{formatYearsOfExperience(job.yearsOfExperienceRequired) ?? "Not required"}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Education</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 truncate" title={job.minimumEducationRequired ?? "Open to all"}>
                        {job.minimumEducationRequired ?? "Open to all"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Vacancies</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{job.vacancies ? `${job.vacancies} open positions` : "Multiple"}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* Detailed Information Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Award className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-900">Requirements & Skills</h3>
                      </div>
                      
                      <div className="space-y-5">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Main Skill / Specialization</p>
                            <p className="text-slate-900 font-semibold">{job.mainSkillOrSpecialization ?? "General Skills"}</p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Age Preference</p>
                            <p className="text-slate-900 font-semibold">
                              {job.agePreferenceMin || job.agePreferenceMax
                                ? `${job.agePreferenceMin ?? "Any"} - ${job.agePreferenceMax ?? "Any"} years old`
                                : "No age preference"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Minimum Education</p>
                            <p className="text-slate-900 font-semibold">{job.minimumEducationRequired ?? "No specific requirement"}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Info className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-900">Job Classification</h3>
                      </div>

                      <div className="space-y-5">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                            <Tag className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Category</p>
                            <p className="text-slate-900 font-semibold">{job.category ?? "General"}</p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">PSOC Code</p>
                            <p className="text-slate-900 font-mono font-semibold">{job.psocCode ?? "N/A"}</p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Status & Availability</p>
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
          <div className="sticky top-24 space-y-6">
            <Card className="p-8 border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl border-t-4 border-t-blue-600">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-6">Apply for this position</h3>
              {(error || success) && (
                <div className="space-y-3 mb-6">
                  {error && (
                    <Alert variant="destructive" className="border-red-100 bg-red-50 text-red-800 rounded-xl">
                      <AlertDescription className="font-medium">{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 rounded-xl">
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Application Submitted</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Status: <span className="capitalize font-semibold">{applicationStatus}</span>
                      </p>
                    </div>
                  </div>
                  <Link href="/jobseeker/applications">
                    <Button variant="outline" className="w-full">View My Applications</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={submitApplication} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Cover Letter (Recommended)</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                              className="h-7 text-blue-600"
                              onClick={() => setResumeUrl("")}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div className="relative group">
                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 group-hover:bg-slate-100 group-hover:border-slate-400 transition-all cursor-pointer">
                              <FileText className="w-8 h-8 text-slate-400 mb-2" />
                              <p className="text-xs font-medium text-slate-600">Click to upload or drag & drop</p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase">PDF, DOC up to 10MB</p>
                            </div>
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer"
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
                          <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse">
                            <Clock className="w-3 h-3" />
                            Uploading resume...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Expected Salary (Optional)</label>
                      <Input
                        type="text"
                        placeholder="e.g. PHP 20,000 / month"
                        value={expectedSalary}
                        onChange={(e) => setExpectedSalary(e.target.value)}
                        className="w-full text-sm"
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 h-12 text-base font-bold rounded-xl transition-all active:scale-[0.98]"
                    disabled={submitting || uploadingResume || !job}
                  >
                    {submitting ? "Submitting Application..." : "Send Application"}
                    {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                  
                  <p className="text-[11px] text-slate-400 text-center px-4 leading-relaxed">
                    By clicking send, you agree to share your profile and contact info with the employer.
                  </p>
                </form>
              )}
            </Card>

            <Card className="p-6 border-slate-200 bg-white rounded-2xl shadow-sm border-dashed">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">About the Employer</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-blue-600 text-lg">
                    {job?.employerName?.charAt(0) || "E"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {job?.employerName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-blue-500" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Verified Establishment</p>
                    </div>
                  </div>
                </div>
                <Link href={`/employers/${job?.employerId}`} className="block">
                  <Button variant="outline" className="w-full text-xs font-bold h-9 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg">
                    View Establishment Profile
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
