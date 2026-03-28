"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  positionTitle: string;
  description: string;
  location: string;
  employmentType: string;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryPeriod: string | null;
  status: "draft" | "pending" | "active" | "closed" | "archived" | null;
  isPublished: boolean;
  archived: boolean;
  createdAt: string;
};

const STATUS_OPTIONS = ["draft", "pending", "active", "closed", "archived"] as const;

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [updatingJob, setUpdatingJob] = useState(false);
  const [archivingJobId, setArchivingJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    positionTitle: "",
    description: "",
    location: "",
    employmentType: "Full-time",
    salaryMin: "",
    salaryMax: "",
    salaryPeriod: "monthly",
  });
  const [editForm, setEditForm] = useState({
    positionTitle: "",
    description: "",
    location: "",
    employmentType: "Full-time",
    salaryMin: "",
    salaryMax: "",
    salaryPeriod: "",
  });

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/employer/jobs", { cache: "no-store" });
      if (!response.ok) {
        setJobs([]);
        return;
      }
      const data = (await response.json()) as { jobs: Job[] };
      setJobs(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const submitJob = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionTitle: form.positionTitle,
          description: form.description,
          location: form.location,
          employmentType: form.employmentType,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
          salaryPeriod: form.salaryPeriod || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to create job");
        return;
      }

      setForm({
        positionTitle: "",
        description: "",
        location: "",
        employmentType: "Full-time",
        salaryMin: "",
        salaryMax: "",
        salaryPeriod: "monthly",
      });
      await loadJobs();
    } catch {
      setError("Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    jobId: string,
    status: "draft" | "pending" | "active" | "closed" | "archived"
  ) => {
    try {
      const response = await fetch(`/api/employer/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setError("Could not update job status");
        return;
      }

      await loadJobs();
    } catch {
      setError("Could not update job status");
    }
  };

  const startEdit = (job: Job) => {
    setEditingJobId(job.id);
    setEditForm({
      positionTitle: job.positionTitle,
      description: job.description,
      location: job.location,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin ?? "",
      salaryMax: job.salaryMax ?? "",
      salaryPeriod: job.salaryPeriod ?? "",
    });
    setError("");
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingJobId) return;

    setUpdatingJob(true);
    setError("");

    try {
      const response = await fetch(`/api/employer/jobs/${editingJobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionTitle: editForm.positionTitle,
          description: editForm.description,
          location: editForm.location,
          employmentType: editForm.employmentType,
          salaryMin: editForm.salaryMin ? Number(editForm.salaryMin) : null,
          salaryMax: editForm.salaryMax ? Number(editForm.salaryMax) : null,
          salaryPeriod: editForm.salaryPeriod || null,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update job");
        return;
      }

      setEditingJobId(null);
      await loadJobs();
    } catch {
      setError("Could not update job");
    } finally {
      setUpdatingJob(false);
    }
  };

  const archiveJob = async (jobId: string) => {
    const confirmed = window.confirm("Archive this job posting?");
    if (!confirmed) {
      return;
    }

    setArchivingJobId(jobId);
    setError("");

    try {
      const response = await fetch(`/api/employer/jobs/${jobId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not archive job");
        return;
      }

      if (editingJobId === jobId) {
        setEditingJobId(null);
      }
      await loadJobs();
    } catch {
      setError("Could not archive job");
    } finally {
      setArchivingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Manage Jobs</h2>
        <p className="text-sm text-slate-600">Create job posts and monitor application pipelines.</p>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Create Job Post</h3>
        <form onSubmit={submitJob} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

          <input className="rounded border px-3 py-2" placeholder="Position title" value={form.positionTitle} onChange={(e) => setForm((p) => ({ ...p, positionTitle: e.target.value }))} required />
          <input className="rounded border px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} required />

          <textarea className="rounded border px-3 py-2 md:col-span-2 min-h-24" placeholder="Job description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />

          <select className="rounded border px-3 py-2" value={form.employmentType} onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Temporary</option>
            <option>Freelance</option>
            <option>Internship</option>
          </select>

          <input className="rounded border px-3 py-2" placeholder="Salary period (monthly)" value={form.salaryPeriod} onChange={(e) => setForm((p) => ({ ...p, salaryPeriod: e.target.value }))} />
          <input type="number" className="rounded border px-3 py-2" placeholder="Salary min" value={form.salaryMin} onChange={(e) => setForm((p) => ({ ...p, salaryMin: e.target.value }))} />
          <input type="number" className="rounded border px-3 py-2" placeholder="Salary max" value={form.salaryMax} onChange={(e) => setForm((p) => ({ ...p, salaryMax: e.target.value }))} />

          <Button type="submit" disabled={saving} className="md:col-span-2">
            {saving ? "Submitting..." : "Create Job"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-3">My Job Posts</h3>

        {loading ? (
          <p className="text-sm text-slate-600">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-600">No jobs yet.</p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="border rounded-md p-4">
                <p className="font-semibold text-slate-900">{job.positionTitle}</p>
                <p className="text-sm text-slate-600">{job.location} - {job.employmentType}</p>
                <p className="text-sm text-slate-700 mt-1">Status: {job.status ?? "draft"}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(job)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={archivingJobId === job.id || job.status === "archived"}
                    onClick={() => archiveJob(job.id)}
                  >
                    {archivingJobId === job.id ? "Archiving..." : "Archive"}
                  </Button>
                </div>

                {editingJobId === job.id ? (
                  <form onSubmit={submitEdit} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 rounded border p-3 bg-slate-50">
                    <input
                      className="rounded border px-3 py-2"
                      value={editForm.positionTitle}
                      onChange={(e) => setEditForm((p) => ({ ...p, positionTitle: e.target.value }))}
                      placeholder="Position title"
                      required
                    />
                    <input
                      className="rounded border px-3 py-2"
                      value={editForm.location}
                      onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="Location"
                      required
                    />
                    <textarea
                      className="rounded border px-3 py-2 md:col-span-2 min-h-20"
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Description"
                      required
                    />
                    <select
                      className="rounded border px-3 py-2"
                      value={editForm.employmentType}
                      onChange={(e) => setEditForm((p) => ({ ...p, employmentType: e.target.value }))}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Temporary</option>
                      <option>Freelance</option>
                      <option>Internship</option>
                    </select>
                    <input
                      className="rounded border px-3 py-2"
                      value={editForm.salaryPeriod}
                      onChange={(e) => setEditForm((p) => ({ ...p, salaryPeriod: e.target.value }))}
                      placeholder="Salary period"
                    />
                    <input
                      type="number"
                      className="rounded border px-3 py-2"
                      value={editForm.salaryMin}
                      onChange={(e) => setEditForm((p) => ({ ...p, salaryMin: e.target.value }))}
                      placeholder="Salary min"
                    />
                    <input
                      type="number"
                      className="rounded border px-3 py-2"
                      value={editForm.salaryMax}
                      onChange={(e) => setEditForm((p) => ({ ...p, salaryMax: e.target.value }))}
                      placeholder="Salary max"
                    />
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={updatingJob}>
                        {updatingJob ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingJobId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-2">
                  {STATUS_OPTIONS.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={job.status === status ? "default" : "outline"}
                      onClick={() => updateStatus(job.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>

                <Link href={`/employer/jobs/${job.id}/applications`} className="inline-block mt-3 text-sm text-blue-600 hover:underline">
                  View applications
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
