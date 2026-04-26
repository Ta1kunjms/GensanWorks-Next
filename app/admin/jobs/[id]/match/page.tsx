export const dynamic = "force-dynamic";
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";

type Job = {
  id: string;
  positionTitle: string;
  employerId: string;
  establishmentName: string | null;
  location: string | null;
  status: string;
};

export default function JobMatchingDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    const jobId = params?.id;
    if (!jobId) {
      setJob(null);
      return;
    }

    const load = async () => {
      const response = await fetch("/api/admin/jobs?limit=200", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { jobs?: Job[] };
      setJob((payload.jobs ?? []).find((item) => item.id === jobId) ?? null);
    };

    void load();
  }, [params]);

  return (
    <Card className="p-5">
      <h1 className="text-2xl font-bold text-slate-950">Job Matching</h1>
      {job ? (
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>{job.positionTitle}</p>
          <p>{job.establishmentName ?? job.employerId}</p>
          <p>{job.location ?? "Unknown location"}</p>
          <p>Status: {job.status}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Job not found.</p>
      )}
    </Card>
  );
}