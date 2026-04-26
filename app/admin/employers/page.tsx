"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";

type Employer = {
  id: string;
  establishmentName: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  city: string;
  province: string;
  accountStatus: "pending" | "approved" | "rejected" | "suspended" | null;
  createdAt: string;
};

const STATUS_FILTERS = ["pending", "approved", "rejected", "suspended"] as const;
const ACTIONS = ["approved", "rejected", "suspended", "pending"] as const;

export default function AdminEmployersPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [allEmployers, setAllEmployers] = useState<Employer[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        STATUS_FILTERS.map((status) =>
          fetch(`/api/admin/employers?status=${status}`, { cache: "no-store" }).then((response) => ({ status, response }))
        )
      );

      const failed = responses.find((item) => !item.response.ok);
      if (failed) {
        setError("Unable to load employers");
        setEmployers([]);
        return;
      }

      const merged: Employer[] = [];
      for (const item of responses) {
        const payload = (await item.response.json()) as { employers: Employer[] };
        merged.push(...(payload.employers ?? []));
      }

      setAllEmployers(merged);
      setEmployers(merged.filter((employer) => employer.accountStatus === statusFilter));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, accountStatus: (typeof ACTIONS)[number]) => {
    setUpdatingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/employers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus }),
      });

      if (!response.ok) {
        setError("Failed to update employer status");
        return;
      }

      await load();
    } catch {
      setError("Failed to update employer status");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = allEmployers.filter((item) => item.accountStatus === "pending").length;
  const approvedCount = allEmployers.filter((item) => item.accountStatus === "approved").length;
  const rejectedCount = allEmployers.filter((item) => item.accountStatus === "rejected").length;
  const suspendedCount = allEmployers.filter((item) => item.accountStatus === "suspended").length;

  const visibleEmployers = employers.filter((item) => {
    if (!searchQuery.trim()) {
      return true;
    }
    const search = searchQuery.trim().toLowerCase();
    return [item.establishmentName, item.contactPerson, item.email, item.city, item.province]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Employer Approvals</h1>
          <p className="text-sm text-slate-600">Approve, reject, suspend, and track employer onboarding.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{approvedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{rejectedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Suspended</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{suspendedCount}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search employers by establishment, contact, email, or location"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
      />

      {error ? <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card> : null}

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading employers...</p>
        ) : visibleEmployers.length === 0 ? (
          <p className="text-sm text-slate-600">No employers for this status.</p>
        ) : (
          <ul className="space-y-3">
            {visibleEmployers.map((employer) => (
              <li key={employer.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployer(employer);
                        setDetailsOpen(true);
                      }}
                      className="text-left font-semibold text-slate-900 hover:underline"
                    >
                      {employer.establishmentName}
                    </button>
                    <p className="text-sm text-slate-600 mt-1">
                      Contact: {employer.contactPerson} ({employer.email})
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {employer.city}, {employer.province} • Submitted {formatDate(employer.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold">
                    {employer.accountStatus === "approved" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
                    {employer.accountStatus === "rejected" ? <XCircle className="h-3.5 w-3.5 text-rose-600" /> : null}
                    {employer.accountStatus === "pending" ? <Clock className="h-3.5 w-3.5 text-amber-600" /> : null}
                    {employer.accountStatus ?? "pending"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployer(employer);
                      setDetailsOpen(true);
                    }}
                  >
                    View details
                  </Button>
                  {ACTIONS.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={employer.accountStatus === status ? "default" : "outline"}
                      disabled={updatingId === employer.id}
                      onClick={() => updateStatus(employer.id, status)}
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

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedEmployer(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employer details</DialogTitle>
            <DialogDescription>
              Review the current record before changing account status.
            </DialogDescription>
          </DialogHeader>

          {selectedEmployer ? (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Establishment</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedEmployer.establishmentName}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                  <p className="mt-1 font-semibold text-slate-950 capitalize">{selectedEmployer.accountStatus ?? "pending"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Contact person</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedEmployer.contactPerson}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Phone</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedEmployer.contactPhone}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedEmployer.email}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Location</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {selectedEmployer.city}, {selectedEmployer.province}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatDate(selectedEmployer.createdAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
