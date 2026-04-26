export const dynamic = "force-dynamic";
"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  status: "pending" | "approved" | "rejected" | null;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const STATUS_FILTERS = ["pending", "approved", "rejected"] as const;
const ACTIONS = ["approved", "rejected", "pending"] as const;

function statusPill(status: AccessRequest["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700 border-emerald-300";
  }
  if (status === "rejected") {
    return "bg-rose-100 text-rose-700 border-rose-300";
  }
  return "bg-amber-100 text-amber-700 border-amber-300";
}

export default function AdminAccessRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [allRequests, setAllRequests] = useState<AccessRequest[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (selectedStatus: (typeof STATUS_FILTERS)[number] = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const [filteredResponse, allResponse] = await Promise.all([
        fetch(`/api/admin/access-requests?status=${selectedStatus}`, {
          cache: "no-store",
        }),
        fetch("/api/admin/access-requests?status=all", {
          cache: "no-store",
        }),
      ]);

      if (!filteredResponse.ok) {
        setError("Unable to load access requests");
        setRequests([]);
        return;
      }

      const payload = (await filteredResponse.json()) as { requests: AccessRequest[] };
      setRequests(payload.requests ?? []);

      if (allResponse.ok) {
        const allPayload = (await allResponse.json()) as { requests: AccessRequest[] };
        setAllRequests(allPayload.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: (typeof ACTIONS)[number]) => {
    setUpdatingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/access-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setError("Failed to update access request");
        return;
      }

      await load();
    } catch {
      setError("Failed to update access request");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = allRequests.filter((item) => item.status === "pending").length;
  const approvedCount = allRequests.filter((item) => item.status === "approved").length;
  const rejectedCount = allRequests.filter((item) => item.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Admin Access Requests</h1>
          <p className="text-sm text-slate-600">Review, approve, and track admin access submissions.</p>
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

      <div className="grid gap-3 md:grid-cols-3">
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

      {error ? <Card className="p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</Card> : null}

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-600">No access requests for this status.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="border rounded-md p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{request.name}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {request.organization} • {request.email} • {request.phone}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      Submitted: {formatDate(request.createdAt)}
                    </p>
                    {request.reviewedAt ? (
                      <p className="text-sm text-slate-700 mt-1">Reviewed: {formatDate(request.reviewedAt)}</p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPill(request.status)}`}
                  >
                    {request.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {request.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> : null}
                    {request.status === "pending" || request.status === null ? <Clock className="h-3.5 w-3.5" /> : null}
                    {request.status ?? "pending"}
                  </span>
                </div>

                {request.notes ? (
                  <p className="text-sm text-slate-700 mt-1">Notes: {request.notes}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-3">
                  {ACTIONS.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={request.status === status ? "default" : "outline"}
                      disabled={updatingId === request.id}
                      onClick={() => updateStatus(request.id, status)}
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
