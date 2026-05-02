"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Building2,
  TrendingUp,
  Briefcase,
  ArrowRight,
} from "lucide-react";

type ApplicationItem = {
  id: string;
  status: string | null;
  source: "direct" | "referred";
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
  const [activeTab, setActiveTab] = useState("direct");

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
    const viaReferral = applications.filter((a) => a.source === "referred").length;
    const direct = applications.filter((a) => a.source === "direct").length;
    const underReview = applications.filter((a) => a.status === "under_review").length;
    const hired = applications.filter((a) => a.status === "hired").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, viaReferral, direct, underReview, hired, rejected };
  }, [applications]);

  const filterApps = (apps: ApplicationItem[]) =>
    apps
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
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const directApps = useMemo(
    () => filterApps(applications.filter((a) => a.source === "direct")),
    [applications, statusFilter, searchTerm]
  );

  const referredApps = useMemo(
    () => filterApps(applications.filter((a) => a.source === "referred")),
    [applications, statusFilter, searchTerm]
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "under_review": return "bg-amber-100 text-amber-800";
      case "interview": return "bg-indigo-100 text-indigo-800";
      case "hired": return "bg-emerald-100 text-emerald-800";
      case "rejected": return "bg-rose-100 text-rose-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "under_review": return <Clock className="h-3.5 w-3.5" />;
      case "hired": return <CheckCircle className="h-3.5 w-3.5" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "under_review": return "Under Review";
      case "interview": return "Interview";
      case "hired": return "Hired";
      case "rejected": return "Rejected";
      default: return "Pending";
    }
  };

  const renderApplicationRow = (application: ApplicationItem) => (
    <tr key={application.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-4 px-4">
        <div>
          <p className="font-medium text-slate-900">{application.positionTitle || "Position"}</p>
          {application.interviewDate && (
            <p className="text-xs text-indigo-600 mt-0.5">
              Interview: {formatDate(application.interviewDate)}
            </p>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{application.employerName || "—"}</span>
        </div>
        {application.location && (
          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs">{application.location}</span>
          </div>
        )}
      </td>
      <td className="py-4 px-4">
        <Badge className={`${getStatusColor(application.status)} text-xs flex items-center gap-1 w-fit`}>
          {getStatusIcon(application.status)}
          {getStatusLabel(application.status)}
        </Badge>
      </td>
      <td className="py-4 px-4 text-sm text-slate-500">{formatDate(application.submittedAt)}</td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Link href={`/jobseeker/applications/${application.id}`}>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
              View
            </Button>
          </Link>
          <Link href={`/jobseeker/jobs/${application.jobId}`}>
            <Button variant="outline" size="sm" className="text-xs">Job</Button>
          </Link>
        </div>
      </td>
    </tr>
  );

  const renderTable = (apps: ApplicationItem[], emptyMessage: string) => (
    loading ? (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    ) : apps.length === 0 ? (
      <Card className="p-12 text-center border border-dashed border-slate-300">
        <p className="text-slate-600 mb-4">{emptyMessage}</p>
        <Link href="/jobseeker/jobs">
          <Button>Browse Jobs</Button>
        </Link>
      </Card>
    ) : (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employer</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Applied</th>
              <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {apps.map(renderApplicationRow)}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-600 mt-2">
          Track your job applications and follow their progress.
        </p>
      </div>

      {/* Stats Grid - 6 cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </Card>
          <Card className="p-5 border-blue-200 bg-blue-50">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Via Referral</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{stats.viaReferral}</p>
            <div className="flex items-center gap-1 mt-1">
              <Briefcase className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </Card>
          <Card className="p-5 border-slate-200 bg-slate-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Direct</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.direct}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </Card>
          <Card className="p-5 border-amber-200 bg-amber-50">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Under Review</p>
            <p className="text-3xl font-bold text-amber-900 mt-1">{stats.underReview}</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </div>
          </Card>
          <Card className="p-5 border-emerald-200 bg-emerald-50">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Hired</p>
            <p className="text-3xl font-bold text-emerald-900 mt-1">{stats.hired}</p>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </Card>
          <Card className="p-5 border-rose-200 bg-rose-50">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Rejected</p>
            <p className="text-3xl font-bold text-rose-900 mt-1">{stats.rejected}</p>
            <div className="flex items-center gap-1 mt-1">
              <XCircle className="h-3.5 w-3.5 text-rose-400" />
            </div>
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
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabbed Application Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Direct Applications
            {stats.direct > 0 && (
              <span className="ml-1 bg-slate-200 text-slate-700 text-xs rounded-full px-1.5 py-0.5">
                {stats.direct}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="referred" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Via Referral
            {stats.viaReferral > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5">
                {stats.viaReferral}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-4">
          {renderTable(directApps, "No direct applications yet. Browse jobs and start applying!")}
        </TabsContent>

        <TabsContent value="referred" className="mt-4">
          {renderTable(referredApps, "No PESO referrals yet. Visit a PESO office to get referred to open positions.")}
        </TabsContent>
      </Tabs>

      {!loading && applications.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          {activeTab === "direct" ? directApps.length : referredApps.length} of{" "}
          {activeTab === "direct" ? stats.direct : stats.viaReferral} applications shown
        </p>
      )}
    </div>
  );
}
