"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Enter a valid email";
    if (!password) nextErrors.password = "Password is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid admin credentials.");
      } else if (data.user) {
        router.push("/admin/dashboard");
      }
    } catch (submitError) {
      setError("An unexpected error occurred.");
      console.error(submitError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Admin sign in"
      subtitle="Use approved administrator credentials to access the management console."
      roleLabel="Admin Portal"
      roleId="admin"
      sideTitle="Admin-only access"
      sideBullets={[
        "Authorized admin credentials are required",
        "Request-based admin onboarding is supported",
        "Secure controls for official PESO operations",
      ]}
      showPrimaryPortals={false}
      showAdminPortalButton
      footer={
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            Need admin access? <Link href="/signup/admin-request" className="font-semibold text-sky-700 hover:text-sky-800">Request admin access</Link>
          </p>
          <p className="text-slate-600">
            Jobseeker/Employer login? <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">Go here</Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Admin Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
              placeholder="admin@example.com"
            />
          </div>
          {fieldErrors.email ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.email}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.password}</p> : null}
        </div>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Signing in..." : "Sign In as Admin"}
        </Button>
      </form>
    </AuthShell>
  );
}
