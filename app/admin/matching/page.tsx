"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Job = {
  id: string;
  positionTitle: string;
  status: string;
  archived: boolean;
  employerId: string;
  establishmentName: string | null;
};

export default function AdminMatchingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/jobs?status=active&limit=100", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { jobs?: Job[] };
        setJobs((payload.jobs ?? []).filter((job) => !job.archived && job.status === "active"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return jobs;
    return jobs.filter((job) =>
      [job.positionTitle, job.establishmentName ?? ""].some((value) => value.toLowerCase().includes(searchTerm))
    );
  }, [jobs, search]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Matching</h1>
        <p className="mt-1 text-sm text-slate-600">Open the job matching detail flow for active jobs.</p>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search active jobs"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <Card className="p-5 text-sm text-slate-600">Loading jobs...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-5 text-sm text-slate-600">No active jobs available for matching.</Card>
        ) : (
          filtered.map((job) => (
            <Card key={job.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{job.positionTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">{job.establishmentName ?? `Employer ${job.employerId.slice(0, 8)}`}</p>
                </div>
                <Button variant="outline" asChild>
                  <Link href={`/admin/jobs/${job.id}/match`}>Run matching</Link>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}