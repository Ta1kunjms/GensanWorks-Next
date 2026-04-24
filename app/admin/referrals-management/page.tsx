"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Referral = {
  id: string;
  applicant: string;
  employer: string;
  vacancy: string;
  status: string;
  dateReferred: string | null;
};

type ResponsePayload = {
  referrals: Referral[];
  totalReferrals?: number;
  limit?: number;
  offset?: number;
};

const STATUS_OPTIONS = ["all", "Pending", "For Interview", "Hired", "Rejected", "Withdrawn"] as const;

export default function AdminReferralsManagementPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/referrals?limit=200", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load referrals");
        }

        const payload = (await response.json()) as ResponsePayload;
        setReferrals(payload.referrals ?? []);
      } catch {
        setError("Unable to load referrals");
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return referrals.filter((referral) => {
      const matchesSearch =
        !searchTerm ||
        [referral.applicant, referral.employer, referral.vacancy].some((value) =>
          value.toLowerCase().includes(searchTerm)
        );
      const matchesStatus = status === "all" || referral.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [referrals, search, status]);

  const updateStatus = async (referralId: string, nextStatus: string) => {
    setUpdatingId(referralId);
    try {
      const response = await fetch(`/api/referrals/${referralId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update referral");
      }

      const updated = (await response.json()) as Referral;
      setReferrals((current) => current.map((item) => (item.id === referralId ? { ...item, status: updated.status } : item)));
    } catch {
      setError("Unable to update referral status");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteReferral = async (referralId: string) => {
    const confirmed = window.confirm("Delete this referral record? This also removes the linked application.");
    if (!confirmed) return;

    setDeletingId(referralId);
    try {
      const response = await fetch(`/api/referrals/${referralId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete referral");
      }

      setReferrals((current) => current.filter((item) => item.id !== referralId));
    } catch {
      setError("Unable to delete referral");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Referrals Management</h1>
          <p className="mt-1 text-sm text-slate-600">Track referral outcomes and export records.</p>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            const response = await fetch("/api/admin/export/referrals?format=csv", { cache: "no-store" });
            if (!response.ok) return;
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "referrals.csv";
            anchor.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search applicant, employer, or vacancy"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
        />
        <select
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading referrals...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No referrals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Applicant</th>
                  <th className="px-4 py-3 font-semibold">Employer</th>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Referred</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((referral) => (
                  <tr key={referral.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 align-top font-medium text-slate-950">{referral.applicant}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{referral.employer}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{referral.vacancy}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{referral.status}</td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {referral.dateReferred ? formatDate(referral.dateReferred) : "Unknown"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <select
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          value={referral.status}
                          disabled={updatingId === referral.id}
                          onChange={(event) => void updateStatus(referral.id, event.target.value)}
                        >
                          {STATUS_OPTIONS.filter((option) => option !== "all").map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          disabled={deletingId === referral.id}
                          onClick={() => void deleteReferral(referral.id)}
                        >
                          {deletingId === referral.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}