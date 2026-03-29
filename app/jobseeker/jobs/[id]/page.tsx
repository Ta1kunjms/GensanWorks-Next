"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
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
        const data = (await response.json()) as JobDetailResponse;

        if (!response.ok || !data.id) {
          setError(data.error ?? "Unable to load job details");
          setJob(null);
          return;
        }

        setJob(data);
        setHasApplied(false);
        setApplicationStatus(null);
      } catch {
        setError("Unable to load job details");
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [jobId]);

  const salaryText = useMemo(() => {
    if (!job) return "";
    if (!job.salaryMin || !job.salaryMax) return "Salary not disclosed";
    return `PHP ${job.salaryMin} - PHP ${job.salaryMax}${job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""}`;
  }, [job]);

  const requiredSkills = useMemo(() => toStringList(job?.requiredSkills), [job?.requiredSkills]);
  const preferredSkills = useMemo(() => toStringList(job?.preferredSkills), [job?.preferredSkills]);
  const benefits = useMemo(() => toStringList(job?.benefits), [job?.benefits]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Job Details</h2>
          <p className="text-sm text-slate-600">Review the role and submit your application.</p>
        </div>
        <Link href="/jobseeker/jobs" className="text-sm text-blue-600 hover:underline">
          Back to jobs
        </Link>
      </div>

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading job details...</p>
        ) : !job ? (
          <p className="text-sm text-red-600">{error || "Job not found"}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{job.positionTitle}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {job.employerName ?? "Unknown employer"} - {job.location}
              </p>
              <p className="text-sm text-slate-700 mt-1">{salaryText}</p>
              <p className="text-sm text-slate-700 mt-1">Employment Type: {job.employmentType}</p>
              <p className="text-sm text-slate-700 mt-1">Vacancies: {job.vacancies ?? "N/A"}</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900">Description</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>

            {job.responsibilities ? (
              <div>
                <h4 className="font-semibold text-slate-900">Responsibilities</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            ) : null}

            {job.qualifications ? (
              <div>
                <h4 className="font-semibold text-slate-900">Qualifications</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.qualifications}</p>
              </div>
            ) : null}

            {requiredSkills.length > 0 ? (
              <div>
                <h4 className="font-semibold text-slate-900">Required Skills</h4>
                <p className="text-sm text-slate-700">{requiredSkills.join(", ")}</p>
              </div>
            ) : null}

            {preferredSkills.length > 0 ? (
              <div>
                <h4 className="font-semibold text-slate-900">Preferred Skills</h4>
                <p className="text-sm text-slate-700">{preferredSkills.join(", ")}</p>
              </div>
            ) : null}

            {benefits.length > 0 ? (
              <div>
                <h4 className="font-semibold text-slate-900">Benefits</h4>
                <p className="text-sm text-slate-700">{benefits.join(", ")}</p>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {!loading && job ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">Apply to this Job</h3>

          {hasApplied ? (
            <p className="text-sm text-emerald-700 mt-2">
              You already applied to this job. Current status: {applicationStatus ?? "pending"}.
            </p>
          ) : (
            <form onSubmit={submitApplication} className="mt-3 space-y-3">
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <div>
                <label className="text-sm text-slate-700">Cover Letter (optional)</label>
                <textarea
                  className="w-full rounded border px-3 py-2"
                  rows={6}
                  value={coverLetter}
                  onChange={(event) => setCoverLetter(event.target.value)}
                  placeholder="Write a short introduction and why you fit this role"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700">Resume URL (optional)</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={resumeUrl}
                  onChange={(event) => setResumeUrl(event.target.value)}
                  placeholder="https://..."
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadResume(file);
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500">Allowed: PDF, DOC, DOCX up to 10MB</p>
                </div>
                {uploadingResume ? <p className="mt-1 text-xs text-slate-600">Uploading resume...</p> : null}
              </div>

              <Button type="submit" disabled={submitting || uploadingResume}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          )}
        </Card>
      ) : null}
    </div>
  );
}
