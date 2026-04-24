"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, CheckCircle, XCircle, MapPin, Building2 } from "lucide-react";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const accepted = applications.filter((a) => a.status === "accepted").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, pending, accepted, rejected };
  }, [applications]);

  const filtered = useMemo(() => {
    return applications
      .filter((app) => {
        if (statusFilter !== "all" && app.status !== statusFilter) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          app.positionTitle?.toLowerCase().includes(term) ||
          app.employerName?.toLowerCase().includes(term) ||
          app.location?.toLowerCase().includes(term)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
  }, [applications, statusFilter, searchTerm]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "reviewed":
        return "bg-sky-100 text-sky-800";
      case "shortlisted":
        return "bg-purple-100 text-purple-800";
      case "interview":
        return "bg-indigo-100 text-indigo-800";
      case "accepted":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "reviewed":
        return "Reviewed";
      case "shortlisted":
        return "Shortlisted";
      case "interview":
        return "Interview";
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-600 mt-2">
          Track your job applications and follow their progress.
        </p>
      </div>

      {/* Stats Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <p className="text-sm font-medium text-slate-600">Total Applications</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</p>
          </Card>
          <Card className="p-6 border-amber-200 bg-amber-50">
            <p className="text-sm font-medium text-amber-700">Pending</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">{stats.pending}</p>
          </Card>
          <Card className="p-6 border-emerald-200 bg-emerald-50">
            <p className="text-sm font-medium text-emerald-700">Accepted</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2">{stats.accepted}</p>
          </Card>
          <Card className="p-6 border-rose-200 bg-rose-50">
            <p className="text-sm font-medium text-rose-700">Rejected</p>
            <p className="text-3xl font-bold text-rose-900 mt-2">{stats.rejected}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Search by position, company, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-300">
          <p className="text-slate-600 mb-4">No applications found</p>
          <Link href="/jobseeker/jobs">
            <Button>Browse Jobs</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((application) => (
            <Card
              key={application.id}
              className="p-6 hover:shadow-md transition-shadow border border-slate-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {application.positionTitle || "Position"}
                    </h3>
                    <Badge className={`${getStatusColor(application.status)} text-xs`}>
                      {getStatusIcon(application.status) && (
                        <span className="mr-1 flex items-center">
                          {getStatusIcon(application.status)}
                        </span>
                      )}
                      {getStatusLabel(application.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{application.employerName || "Employer"}</span>
                    </div>
                    {application.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{application.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Applied {formatDate(application.submittedAt)}</span>
                    </div>
                  </div>

                  {application.feedback && (
                    <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                      <p className="text-xs font-medium text-slate-700 mb-1">Feedback:</p>
                      <p className="text-sm text-slate-600">{application.feedback}</p>
                    </div>
                  )}

                  {application.interviewDate && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded border border-indigo-200">
                      <p className="text-sm font-medium text-indigo-700">
                        Interview scheduled: {formatDate(application.interviewDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href={`/jobseeker/applications/${application.id}`}>
                    <Button size="sm" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/jobseeker/jobs/${application.jobId}`}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      View Job
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && applications.length > 0 && (
        <p className="text-sm text-slate-600 text-center">
          Showing {filtered.length} of {applications.length} applications
        </p>
      )}
    </div>
  );
}
