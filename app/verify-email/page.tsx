"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

type AccountRole = "admin" | "employer" | "jobseeker";

type ApiResponse = {
  message?: string;
  error?: string;
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token") ?? "", [searchParams]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>("jobseeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requestVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setError(payload.error ?? "Unable to process request");
        return;
      }

      setSuccess(payload.message ?? "If an account exists, a verification email was sent.");
    } catch {
      setError("Unable to process request");
    } finally {
      setLoading(false);
    }
  };

  const confirmVerification = async () => {
    if (!token) {
      setError("Missing verification token");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setError(payload.error ?? "Unable to verify email");
        return;
      }

      setSuccess(payload.message ?? "Email verified successfully");
    } catch {
      setError("Unable to verify email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verify Email"
      subtitle="Protect your account by confirming ownership of your email address."
      roleLabel="Account Security"
      roleId={role}
      sideTitle="Why verification matters"
      sideBullets={[
        "Activates secure account notifications",
        "Strengthens account recovery controls",
        "Confirms trusted communication channel",
      ]}
      footer={
        <p className="text-sm text-slate-600">
          Back to <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
        </p>
      }
    >
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {token ? <BadgeCheck className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          {token ? "Token verification" : "Request verification"}
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
        ) : null}

        {token ? (
          <Button type="button" onClick={confirmVerification} disabled={loading} className="w-full" size="lg">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        ) : (
          <form onSubmit={requestVerification} className="space-y-4">
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
              {loading ? "Sending..." : "Send Verification Email"}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
