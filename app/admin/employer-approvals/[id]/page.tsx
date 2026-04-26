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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      pending: { label: "Pending Review", cls: "bg-amber-100 text-amber-700 border-amber-300" },
      approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
      rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700 border-rose-300" },
    }[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 border-slate-300" };
    return <Badge className={`${config.cls} border font-medium`}>{config.label}</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/admin/employer-approvals">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600">
            <ChevronLeft className="w-4 h-4" /> Employer Approvals
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !profile ? (
        <Card className="p-12 text-center">
          <p className="text-slate-600">Employer not found.</p>
        </Card>
      ) : (
        <>
          {/* Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {profile.establishmentName?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{profile.establishmentName}</h1>
                  <p className="text-sm text-slate-600 mt-0.5">{profile.email}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <StatusBadge status={profile.srsStatus} />
                    <span className="text-xs text-slate-400">SRS Version {profile.srsVersion}</span>
                    {profile.srsSubmittedAt && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Submitted {new Date(profile.srsSubmittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile.srsStatus === "pending" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                    onClick={() => setShowRejectModal(true)}
                    disabled={acting}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => void handleAction("approve")}
                    disabled={acting}
                  >
                    {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )}
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
                      <p className="text-xs text-slate-400 uppercase tracking-wider">{item.label}</p>
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
                          <p className="text-xs text-slate-400">{doc.type}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
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
                          <p className="text-[10px] text-slate-400">{entry.adminName} • {new Date(entry.createdAt).toLocaleDateString()}</p>
                          {entry.reason && <p className="text-xs text-slate-500 mt-0.5 italic">&ldquo;{entry.reason}&rdquo;</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No history yet.</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reject SRS Profile</h3>
                <p className="text-xs text-slate-500">The employer will be notified with your reason.</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Rejection Reason <span className="text-rose-500">*</span></label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the SRS profile is being rejected..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => void handleAction("reject")}
                disabled={!rejectionReason.trim() || acting}
              >
                {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
