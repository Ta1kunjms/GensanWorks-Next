"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

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

export default function AdminAccessRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/access-requests?status=${statusFilter}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to load access requests");
        setRequests([]);
        return;
      }

      const payload = (await response.json()) as { requests: AccessRequest[] };
      setRequests(payload.requests ?? []);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Access Requests</h2>
          <p className="text-sm text-slate-600">Review and approve admin access submissions.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
          className="rounded border px-3 py-2 text-sm"
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
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
                <p className="font-semibold text-slate-900">{request.name}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {request.organization} • {request.email} • {request.phone}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  Submitted: {formatDate(request.createdAt)}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  Current status: {request.status ?? "pending"}
                </p>

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
