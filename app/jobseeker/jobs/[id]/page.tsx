"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  Heart, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  ChevronLeft,
  Clock,
  Info,
  Building2,
  FileText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type JobDetail = {
  id: string;
  employerId: string;
  positionTitle: string;
  description: string;
  responsibilities: string | null;
  qualifications: string | null;
  location: string;
  city: string | null;
  province: string | null;
  employmentType: string;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryPeriod: string | null;
  vacancies: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  benefits: unknown;
  publishedAt: string | null;
  employerName: string | null;
};

type JobDetailResponse = JobDetail & {
  error?: string;
  hasApplied?: boolean;
  applicationStatus?: string | null;
};

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [job, setJob] = useState<JobDetail | null>(null);
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
  const [extraAttachments, setExtraAttachments] = useState<string[]>([]);
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
        const data = (await response.json()) as JobDetailResponse & { isSaved?: boolean };

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

  const salaryText = useMemo(() => {
    if (!job) return "";
    if (!job.salaryMin || !job.salaryMax) return "Salary not disclosed";
    return `PHP ${job.salaryMin} - PHP ${job.salaryMax}${job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""}`;
  }, [job]);

  const requiredSkills = useMemo(() => toStringList(job?.requiredSkills), [job?.requiredSkills]);
  const preferredSkills = useMemo(() => toStringList(job?.preferredSkills), [job?.preferredSkills]);
  const benefits = useMemo(() => toStringList(job?.benefits), [job?.benefits]);

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
            <Info className="w-4 h-4" />
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
                <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                          {job.employmentType}
                        </Badge>
                        {job.salaryMax && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                            High Pay
                          </Badge>
                        )}
                      </div>
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{job.positionTitle}</h1>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{job.employerName ?? "Confidential Employer"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Posted {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : "Recent"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                  {/* Job Overview Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Salary</p>
                      <p className="text-sm font-semibold text-slate-900">{salaryText}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Vacancies</p>
                      <p className="text-sm font-semibold text-slate-900">{job.vacancies ?? "1"} Openings</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Experience</p>
                      <p className="text-sm font-semibold text-slate-900">Required</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Work Type</p>
                      <p className="text-sm font-semibold text-slate-900">{job.employmentType}</p>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <section>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Job Description
                      </h3>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                    </section>

                    {job.responsibilities && (
                      <section className="mt-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Key Responsibilities</h3>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.responsibilities}</p>
                      </section>
                    )}

                    {job.qualifications && (
                      <section className="mt-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Qualifications & Requirements</h3>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.qualifications}</p>
                      </section>
                    )}
                  </div>

                  {/* Skills Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                    {requiredSkills.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {requiredSkills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="px-3 py-1 font-normal bg-white">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {preferredSkills.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900">Preferred Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {preferredSkills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="px-3 py-1 font-normal bg-white border-blue-100 text-blue-700">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {benefits.length > 0 && (
                    <div className="pt-6 border-t border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-4">Benefits & Perks</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right Column: Application Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="p-6 border-slate-200 shadow-md">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Apply Now</h3>
              
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                    disabled={submitting || uploadingResume || !job}
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </Button>
                  
                  <p className="text-[10px] text-slate-500 text-center px-4">
                    By clicking submit, you agree to share your profile and contact info with the employer.
                  </p>
                </form>
              )}
            </Card>

            <Card className="p-5 border-slate-200 bg-slate-50/50">
              <h4 className="text-sm font-bold text-slate-900 mb-3">About the Employer</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-blue-600">
                    {job?.employerName?.charAt(0) || "E"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">
                      {job?.employerName}
                    </p>
                    <p className="text-xs text-slate-500">Verified Establishment</p>
                  </div>
                </div>
                <Link href={`/employers/${job?.employerId}`} className="block">
                  <Button variant="link" className="p-0 h-auto text-xs text-blue-600">
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
