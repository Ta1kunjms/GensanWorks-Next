"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

type AccountRole = "admin" | "employer" | "jobseeker";

type ApiErrorPayload = {
  error?: string;
  requestId?: string;
};

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token") ?? "", [searchParams]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>("jobseeker");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const payload = (await response.json()) as ApiErrorPayload & { message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to process request");
        return;
      }

      setSuccess(payload.message ?? "If an account exists, reset instructions were sent.");
    } catch {
      setError("Unable to process request");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const payload = (await response.json()) as ApiErrorPayload & { message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to reset password");
        return;
      }

      setSuccess(payload.message ?? "Password reset successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Recover account access securely through role-aware password reset workflows."
      roleLabel="Account Security"
      roleId={role}
      sideTitle="Security notes"
      sideBullets={[
        "Reset links are time-limited for safety",
        "Use a strong unique password",
        "Confirm role to route request correctly",
      ]}
      footer={
        <p className="text-sm text-slate-600">
          Back to <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
        </p>
      }
    >
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {token ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          {token ? "Set new password" : "Request reset link"}
        </div>

        {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

        {token ? (
          <form onSubmit={confirmReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-sky-300 focus:ring-2"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-sky-300 focus:ring-2"
                placeholder="Confirm new password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              <ShieldCheck className="mr-2 h-4 w-4" />
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-sky-300 focus:ring-2"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AccountRole)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-sky-300 focus:ring-2"
              >
                <option value="jobseeker">Job Seeker</option>
                <option value="employer">Employer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
