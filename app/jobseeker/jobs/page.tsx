"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Job = {
  id: string;
  positionTitle: string;
  location: string;
  city: string | null;
  province: string | null;
  employmentType: string;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryPeriod: string | null;
  employerName: string | null;
};

export default function JobseekerJobsPage() {
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/jobs${query ? `?search=${encodeURIComponent(query)}` : ""}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        setJobs([]);
        return;
      }

      const data = (await response.json()) as { data?: Job[] };
      setJobs(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs("");
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Browse Jobs</h2>
        <p className="text-sm text-slate-600">Search active opportunities and apply directly.</p>
      </div>

      <Card className="p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadJobs(q);
          }}
          className="flex gap-2"
        >
          <input
            className="flex-1 rounded-md border px-3 py-2"
            placeholder="Search by role, location, company"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm"
          >
            Search
          </button>
        </form>
      </Card>

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-600">No matching jobs found.</p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="border rounded-md p-4">
                <Link href={`/jobseeker/jobs/${job.id}`} className="text-lg font-semibold text-slate-900 hover:underline">
                  {job.positionTitle}
                </Link>
                <p className="text-sm text-slate-600 mt-1">
                  {job.employerName ?? "Unknown employer"} - {job.location}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {job.salaryMin && job.salaryMax
                    ? `PHP ${job.salaryMin} - PHP ${job.salaryMax}${job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""}`
                    : "Salary not disclosed"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
