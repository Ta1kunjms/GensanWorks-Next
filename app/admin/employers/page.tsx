"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

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
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/employers?status=${statusFilter}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to load employers");
        setEmployers([]);
        return;
      }

      const payload = (await response.json()) as { employers: Employer[] };
      setEmployers(payload.employers ?? []);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employer Approvals</h2>
          <p className="text-sm text-slate-600">Approve, reject, or suspend employer accounts.</p>
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
          <p className="text-sm text-slate-600">Loading employers...</p>
        ) : employers.length === 0 ? (
          <p className="text-sm text-slate-600">No employers for this status.</p>
        ) : (
          <ul className="space-y-3">
            {employers.map((employer) => (
              <li key={employer.id} className="border rounded-md p-4">
                <p className="font-semibold text-slate-900">{employer.establishmentName}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Contact: {employer.contactPerson} ({employer.email})
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {employer.city}, {employer.province} • Submitted {formatDate(employer.createdAt)}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  Current status: {employer.accountStatus ?? "pending"}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
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
    </div>
  );
}
