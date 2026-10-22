"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Briefcase,
  ArrowRight,
  QrCode,
  Download,
  FileText,
  Send,
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
  qrCodeUrl?: string | null;
  slipNumber?: string | null;
};

export default function JobseekerApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("direct");
  const [selectedSlip, setSelectedSlip] = useState<{ qrCodeUrl: string; slipNumber: string; position: string } | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'referred' || tabParam === 'direct') {
      setActiveTab(tabParam);
    }
  }, []);

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

  const renderApplicationRow = (application: ApplicationItem) => (
    <tr key={application.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-4 px-4">
        <div>
          <p className="font-medium text-slate-900">{application.positionTitle || "Position"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">Applied {formatDate(application.submittedAt)}</p>
          {application.interviewDate && (
            <p className="text-xs text-indigo-700 mt-0.5">
              Interview: {formatDate(application.interviewDate)}
            </p>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm">{application.employerName || "—"}</span>
        </div>
        {application.location && (
          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs">{application.location}</span>
          </div>
        )}
      </td>
      <td className="py-4 px-4">
        {/* A missing status has always been shown as Pending. */}
        <StatusBadge kind="application" status={application.status ?? "pending"} className="w-fit" />
      </td>
      <td className="hidden py-4 px-4 text-sm text-slate-500 sm:table-cell">{formatDate(application.submittedAt)}</td>
      <td className="py-4 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-11 sm:h-9">
            <Link
              href={`/jobseeker/applications/${application.id}`}
              aria-label={`View application for ${application.positionTitle || "Position"}`}
            >
              View
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
            <Link
              href={`/jobseeker/jobs/${application.jobId}`}
              aria-label={`Job posting for ${application.positionTitle || "Position"}`}
            >
              Job
            </Link>
          </Button>
          {application.qrCodeUrl && (
            <Button
              size="sm"
              variant="outline"
              aria-label={`Referral slip for ${application.positionTitle || "Position"}`}
              className="h-11 border-blue-200 text-blue-700 hover:bg-blue-50 sm:h-9"
              onClick={() => setSelectedSlip({
                qrCodeUrl: application.qrCodeUrl!,
                slipNumber: application.slipNumber!,
                position: application.positionTitle || "Position"
              })}
            >
              <QrCode className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Slip
            </Button>
          )}
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
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title={emptyMessage}
        action={
          <Button asChild size="lg">
            <Link href="/jobseeker/jobs">Browse Jobs</Link>
          </Button>
        }
      />
    ) : (
      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th scope="col" className="py-3 px-4 text-sm font-medium text-slate-600">Position</th>
              <th scope="col" className="py-3 px-4 text-sm font-medium text-slate-600">Employer</th>
              <th scope="col" className="py-3 px-4 text-sm font-medium text-slate-600">Status</th>
              <th scope="col" className="hidden py-3 px-4 text-sm font-medium text-slate-600 sm:table-cell">Date Applied</th>
              <th scope="col" className="py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
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
      <PageHeader title="My Applications" description="Track your job applications and follow their progress." />

      {/* Stats Grid - 6 cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats.total} icon={<FileText className="h-4 w-4" />} />
          <StatCard label="Via Referral" value={stats.viaReferral} icon={<Briefcase className="h-4 w-4" />} />
          <StatCard label="Direct" value={stats.direct} icon={<Send className="h-4 w-4" />} />
          <StatCard label="Under Review" value={stats.underReview} icon={<Clock className="h-4 w-4" />} />
          <StatCard label="Hired" value={stats.hired} icon={<CheckCircle className="h-4 w-4" />} />
          <StatCard label="Rejected" value={stats.rejected} icon={<XCircle className="h-4 w-4" />} />
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
            className="h-11 w-full text-base"
            aria-label="Search applications"
          />
        </div>
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11" aria-label="Filter by status">
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
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="direct" className="gap-2 whitespace-normal">
            <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            Direct Applications
            {stats.direct > 0 && (
              <span className="ml-1 bg-slate-200 text-slate-700 text-xs rounded-full px-1.5 py-0.5">
                {stats.direct}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="referred" className="gap-2 whitespace-normal">
            <Briefcase className="hidden h-4 w-4 sm:block" aria-hidden="true" />
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

      {/* Referral Slip Modal */}
      <Dialog open={selectedSlip !== null} onOpenChange={(open) => { if (!open) setSelectedSlip(null); }}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
          {selectedSlip && (
            <>
              <DialogHeader className="border-b p-4 pr-12 text-left">
                <DialogTitle className="text-base font-semibold text-slate-900">Referral Slip QR Code</DialogTitle>
                <DialogDescription className="sr-only">QR code for referral slip {selectedSlip.slipNumber}</DialogDescription>
              </DialogHeader>
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-48 h-48 bg-white border rounded-lg p-2 mb-6">
                  <img src={selectedSlip.qrCodeUrl} alt="Referral QR Code" className="w-full h-full object-contain" />
                </div>
                <p className="text-lg font-semibold text-slate-900">{selectedSlip.slipNumber}</p>
                <p className="text-sm text-slate-600 mt-1">{selectedSlip.position}</p>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                  Present this QR code to the employer during your interview or visit.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border-t grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" className="w-full px-4" asChild>
                  <Link href={`/referral/${selectedSlip.slipNumber}`} target="_blank">
                    Details
                  </Link>
                </Button>
                <Button size="lg" className="w-full px-4" onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedSlip.qrCodeUrl;
                  link.download = `Referral_${selectedSlip.slipNumber}.png`;
                  link.click();
                }}>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Save
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
