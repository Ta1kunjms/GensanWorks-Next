"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type ApplicationItem = {
  id: string;
  status: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  feedback: string | null;
  interviewDate: string | null;
  jobId: string;
  positionTitle: string | null;
  location: string | null;
  employerName: string | null;
};

export default function JobseekerApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/jobseeker/applications", { cache: "no-store" });
        if (!response.ok) {
          setApplications([]);
          return;
        }

        const data = (await response.json()) as { applications: ApplicationItem[] };
        setApplications(data.applications ?? []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Applications</h2>
        <p className="text-sm text-slate-600">Track your application statuses and updates.</p>
      </div>

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-slate-600">
            No applications yet. <Link href="/jobseeker/jobs" className="text-blue-600 hover:underline">Browse jobs</Link>.
          </p>
        ) : (
          <ul className="space-y-3">
            {applications.map((application) => (
              <li key={application.id} className="border rounded-md p-4">
                <p className="font-semibold text-slate-900">
                  {application.positionTitle ?? "Unknown job"}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {application.employerName ?? "Unknown employer"}
                  {application.location ? ` - ${application.location}` : ""}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  Submitted: {formatDate(application.submittedAt)}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  Status: <span className="font-medium">{application.status ?? "pending"}</span>
                </p>
                {application.feedback ? (
                  <p className="text-sm text-slate-700 mt-2">Feedback: {application.feedback}</p>
                ) : null}
                <Link href={`/jobseeker/jobs/${application.jobId}`} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  View job details
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
