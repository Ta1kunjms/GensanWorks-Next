export const dynamic = "force-dynamic";
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Application = {
  id: string;
  applicantId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  status: "pending" | "reviewed" | "shortlisted" | "interview" | "hired" | "rejected" | "withdrawn";
  submittedAt: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  feedback: string | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  userCity: string | null;
  userProvince: string | null;
  userCurrentOccupation: string | null;
  userEducationLevel: string | null;
  userSkills: string[] | null;
  userPreferredLocations: string[] | null;
};

type JobApplicationsResponse = {
  job: {
    id: string;
    positionTitle: string;
  };
  applications: Application[];
};

const STATUS_OPTIONS: Application["status"][] = [
  "pending",
  "reviewed",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "withdrawn",
];

export default function EmployerJobApplicationsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id ?? "";
  const [data, setData] = useState<JobApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/employer/jobs/${jobId}/applications`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to load applications");
        setData(null);
        return;
      }

      const payload = (await response.json()) as JobApplicationsResponse;
      setData(payload);
      setFeedbackDrafts(
        Object.fromEntries(
          (payload.applications ?? []).map((application) => [
            application.id,
            application.feedback ?? "",
          ])
        )
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      void load();
    }
  }, [jobId, load]);

  const updateStatus = async (applicationId: string, status: Application["status"]) => {
    setUpdatingId(applicationId);
    try {
      const response = await fetch(`/api/employer/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          feedback: feedbackDrafts[applicationId]?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        setError("Unable to update status");
        return;
      }

      await load();
    } catch {
      setError("Unable to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {data?.job.positionTitle ?? "Job Applications"}
        </h2>
        <p className="text-sm text-slate-600">Review and update applicant status.</p>
      </div>

      {error ? <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card> : null}

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading applications...</p>
        ) : !data || data.applications.length === 0 ? (
          <p className="text-sm text-slate-600">No applications yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.applications.map((application) => (
              <li key={application.id} className="border rounded-md p-4">
                <p className="font-semibold text-slate-900">
                  {application.applicantName ?? application.userName ?? "Unknown applicant"}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {application.applicantEmail ?? application.userEmail ?? "No email"}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  Submitted: {formatDate(application.submittedAt)}
                </p>
                <p className="text-sm text-slate-700 mt-1">Current: {application.status}</p>

                {application.coverLetter ? (
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                    Cover letter: {application.coverLetter}
                  </p>
                ) : null}

                {application.resumeUrl ? (
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Open resume
                  </a>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">No resume attached.</p>
                )}

                <div className="mt-3 rounded-md border bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
                  <p>Phone: {application.userPhone ?? "N/A"}</p>
                  <p>
                    Location: {application.userCity ?? "N/A"}
                    {application.userProvince ? `, ${application.userProvince}` : ""}
                  </p>
                  <p>Occupation: {application.userCurrentOccupation ?? "N/A"}</p>
                  <p>Education: {application.userEducationLevel ?? "N/A"}</p>
                  <p>
                    Skills: {application.userSkills && application.userSkills.length > 0 ? application.userSkills.join(", ") : "N/A"}
                  </p>
                  <p>
                    Preferred Locations: {application.userPreferredLocations && application.userPreferredLocations.length > 0 ? application.userPreferredLocations.join(", ") : "N/A"}
                  </p>
                </div>

                <div className="mt-3">
                  <label className="text-sm text-slate-700">Feedback (optional)</label>
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    rows={3}
                    value={feedbackDrafts[application.id] ?? ""}
                    onChange={(event) =>
                      setFeedbackDrafts((prev) => ({
                        ...prev,
                        [application.id]: event.target.value,
                      }))
                    }
                    placeholder="Add interview notes or decision rationale"
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {STATUS_OPTIONS.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={application.status === status ? "default" : "outline"}
                      disabled={updatingId === application.id}
                      onClick={() => updateStatus(application.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
