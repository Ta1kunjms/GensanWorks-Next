"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, Building2, FileText,
  AlertTriangle, History, StickyNote, Loader2, ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

type SRSProfile = {
  id: string;
  establishmentName: string;
  email: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  city: string;
  businessType: string;
  employeeCount: number;
  srsStatus: "pending" | "approved" | "rejected";
  srsRejectionReason?: string;
  srsSubmittedAt?: string;
  srsApprovedAt?: string;
  srsVersion: number;
  documents: { name: string; url: string; type: string }[];
};

type HistoryEntry = {
  id: string;
  action: string;
  reason?: string;
  createdAt: string;
  adminName: string;
};

export default function AdminEmployerApprovalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const employerId = params?.id;

  const [profile, setProfile] = useState<SRSProfile | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!employerId) return;
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/employers/${employerId}/srs`);
      if (res.ok) {
        const data = await res.json() as { profile: SRSProfile; history: HistoryEntry[] };
        setProfile(data.profile);
        setHistory(data.history ?? []);
      }
      setLoading(false);
    })();
  }, [employerId]);

  const handleAction = async (action: "approve" | "reject") => {
    if (!profile || acting) return;
    setActing(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/admin/employers/${employerId}/srs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rejectionReason: action === "reject" ? rejectionReason.trim() : undefined,
        adminNote: adminNote.trim() || undefined,
      }),
    });

    if (res.ok) {
      setSuccess(action === "approve" ? "Employer SRS profile approved successfully!" : "Employer SRS profile rejected.");
      setProfile((prev) => prev ? { ...prev, srsStatus: action === "approve" ? "approved" : "rejected", srsRejectionReason: action === "reject" ? rejectionReason : undefined } : null);
      setShowRejectModal(false);
      setTimeout(() => router.push("/admin/employer-approvals"), 1500);
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Action failed");
    }
    setActing(false);
  };

  // Closing the reject dialog discards the typed reason and any error from it.
  const closeOrOpenRejectModal = (open: boolean) => {
    setShowRejectModal(open);
    if (!open) {
      setRejectionReason("");
      setError("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-sm">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600">
          <Link href="/admin/employer-approvals">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Employer Approvals
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !profile ? (
        <EmptyState title="Employer not found." />
      ) : (
        <>
          {/* Header */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0" aria-hidden="true">
                {profile.establishmentName?.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <PageHeader
                  title={profile.establishmentName}
                  description={profile.email}
                  actions={
                    profile.srsStatus === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => setShowRejectModal(true)}
                          disabled={acting}
                        >
                          <XCircle className="w-4 h-4 mr-2" aria-hidden="true" /> Reject
                        </Button>
                        <Button
                          onClick={() => void handleAction("approve")}
                          disabled={acting}
                        >
                          {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />}
                          Approve
                        </Button>
                      </>
                    ) : null
                  }
                />
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <StatusBadge
                    kind="employer"
                    status={profile.srsStatus}
                    label={profile.srsStatus === "pending" ? "Pending Review" : undefined}
                  />
                  <span className="text-xs text-muted-foreground">SRS Version {profile.srsVersion}</span>
                  {profile.srsSubmittedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      Submitted {new Date(profile.srsSubmittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {success && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
                ✓ {success}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                ⚠ {error}
              </div>
            )}

            {profile.srsStatus === "rejected" && profile.srsRejectionReason && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Rejection Reason
                </p>
                <p className="text-sm text-rose-700 mt-1">{profile.srsRejectionReason}</p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Business Info */}
              <Card className="p-6">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-blue-500" /> Business Information
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Business Type", value: profile.businessType },
                    { label: "Employees", value: profile.employeeCount?.toString() },
                    { label: "Contact Person", value: profile.contactPerson },
                    { label: "Phone", value: profile.contactPhone },
                    { label: "Address", value: `${profile.address}, ${profile.city}` },
                  ].map((item) => (
                    <div key={item.label} className={item.label === "Address" ? "col-span-2" : ""}>
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <p className="font-semibold text-slate-900 mt-0.5">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Uploaded Documents */}
              <Card className="p-6">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-blue-500" /> Submitted Documents
                </h2>
                {profile.documents?.length > 0 ? (
                  <div className="space-y-2">
                    {profile.documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm group-hover:text-blue-700">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No documents uploaded.</p>
                )}
              </Card>

              {/* Admin Note */}
              <Card className="p-6">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <StickyNote className="w-4 h-4 text-blue-500" /> Internal Admin Note (Private)
                </h2>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a private note about this employer for internal reference..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </Card>
            </div>

            {/* Approval History */}
            <div className="space-y-6">
              <Card className="p-5">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-blue-500" /> Approval History
                </h2>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          entry.action === "approved" ? "bg-emerald-100" :
                          entry.action === "rejected" ? "bg-rose-100" : "bg-amber-100"
                        }`}>
                          {entry.action === "approved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                           entry.action === "rejected" ? <XCircle className="w-3.5 h-3.5 text-rose-600" /> :
                           <Clock className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 capitalize">{entry.action}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.adminName} • {new Date(entry.createdAt).toLocaleDateString()}</p>
                          {entry.reason && <p className="text-xs text-slate-500 mt-0.5 italic">&ldquo;{entry.reason}&rdquo;</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No history yet.</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={closeOrOpenRejectModal}>
          <DialogContent className="max-w-md">
            <div className="flex items-center gap-3 pr-6">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center" aria-hidden="true">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="font-bold text-base text-slate-900">Reject SRS Profile</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">The employer will be notified with your reason.</DialogDescription>
              </div>
            </div>
            <div>
              <label htmlFor="srs-rejection-reason" className="text-sm font-semibold text-slate-700 block mb-2">Rejection Reason <span className="text-rose-500" aria-hidden="true">*</span></label>
              <textarea
                id="srs-rejection-reason"
                aria-required="true"
                aria-describedby="srs-rejection-hint"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the SRS profile is being rejected..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none resize-none"
              />
              <p id="srs-rejection-hint" className="mt-1 text-xs text-slate-600">
                Required. Confirm Rejection is available once you enter a reason.
              </p>
            </div>
            {/* The page behind the modal is inert, so action errors are shown here. */}
            {error ? (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => closeOrOpenRejectModal(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => void handleAction("reject")}
                disabled={!rejectionReason.trim() || acting}
              >
                {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Rejection
              </Button>
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
