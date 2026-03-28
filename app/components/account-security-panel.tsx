"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DeletionRequest = {
  id: string;
  status: "pending" | "cancelled" | "processed";
  requestedAt: string;
  deleteAfter: string;
  cancelledAt: string | null;
  processedAt: string | null;
};

type StatusResponse = {
  deletionRequest: DeletionRequest | null;
  requestId?: string;
};

type RequestResponse = {
  message?: string;
  error?: string;
  requestId?: string;
  deletionRequest?: {
    id: string;
    deleteAfter: string;
  };
};

export function AccountSecurityPanel() {
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [reason, setReason] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch("/api/auth/account-deletion", { cache: "no-store" });
      if (!response.ok) {
        setError("Unable to load account security status");
        return;
      }

      const payload = (await response.json()) as StatusResponse;
      setDeletionRequest(payload.deletionRequest ?? null);
    } catch {
      setError("Unable to load account security status");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const submitDeletionRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/account-deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          reason: reason.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as RequestResponse;
      if (!response.ok) {
        setError(payload.error ?? "Failed to schedule account deletion");
        return;
      }

      setSuccess(payload.message ?? "Account deletion scheduled.");
      setCurrentPassword("");
      setReason("");
      await loadStatus();
    } catch {
      setError("Failed to schedule account deletion");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelDeletionRequest = async () => {
    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/account-deletion/cancel", {
        method: "POST",
      });

      const payload = (await response.json()) as RequestResponse;
      if (!response.ok) {
        setError(payload.error ?? "Failed to cancel account deletion");
        return;
      }

      setSuccess(payload.message ?? "Account deletion request cancelled.");
      await loadStatus();
    } catch {
      setError("Failed to cancel account deletion");
    } finally {
      setCancelling(false);
    }
  };

  const isPending = deletionRequest?.status === "pending";

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Account Security</h3>
        <p className="text-sm text-slate-600">Manage sensitive account actions.</p>
      </div>

      {error ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {loadingStatus ? (
        <p className="text-sm text-slate-600">Loading security settings...</p>
      ) : isPending ? (
        <div className="space-y-3">
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Account deletion is scheduled for {new Date(deletionRequest.deleteAfter).toLocaleString()}.
          </div>
          <Button type="button" variant="outline" onClick={cancelDeletionRequest} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel Deletion Request"}
          </Button>
        </div>
      ) : (
        <form onSubmit={submitDeletionRequest} className="space-y-4">
          <p className="text-sm text-slate-600">
            Request account deletion. Your account will be permanently deleted after a 7-day grace period.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Tell us why you are leaving"
              rows={3}
            />
          </div>
          <Button type="submit" variant="destructive" disabled={submitting}>
            {submitting ? "Scheduling..." : "Schedule Account Deletion"}
          </Button>
        </form>
      )}
    </Card>
  );
}
