"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AccountRole = "admin" | "employer" | "jobseeker";

type ApiResponse = {
  message?: string;
  error?: string;
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-blue-700 mb-2">Verify Email</h1>
        <p className="text-sm text-slate-600 mb-6">
          {token ? "Confirm your email verification token." : "Request a verification email."}
        </p>

        {error ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {token ? (
          <Button type="button" onClick={confirmVerification} disabled={loading} className="w-full">
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        ) : (
          <form onSubmit={requestVerification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AccountRole)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="jobseeker">Job Seeker</option>
                <option value="employer">Employer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Verification Email"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Back to <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
