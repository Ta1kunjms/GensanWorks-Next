"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase-client";

type UserRole = "employer" | "jobseeker";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("jobseeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getFriendlyAuthError = (authError?: string) => {
    if (!authError) return "Sign in failed";

    if (authError.includes("Invalid login credentials")) {
      return "Invalid email or password.";
    }
    
    return authError || "Sign in failed. Please try again.";
  };

  useEffect(() => {
    const roleParam = searchParams?.get("role");
    if (roleParam === "admin") {
      router.replace("/login/admin");
      return;
    }
    if (roleParam === "employer" || roleParam === "jobseeker") {
      setRole(roleParam);
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setError(getFriendlyAuthError(error.message));
      } else if (data.user) {
        const dashboardPaths: Record<UserRole, string> = {
          employer: "/employer/dashboard",
          jobseeker: "/jobseeker/dashboard",
        };

        router.push(dashboardPaths[role]);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/jobseeker/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signupPath = `/signup?role=${role}`;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your account to manage applications, postings, and official PESO workflows."
      roleLabel={`${role.charAt(0).toUpperCase()}${role.slice(1)} Portal`}
      roleId={role}
      sideTitle="Why sign in here"
      sideBullets={[
        "Official PESO-backed employment platform",
        "Role-specific dashboards for focused workflows",
        "Secure authentication for account protection",
      ]}
      showAdminPortalButton={false}
      footer={
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            Don&apos;t have an account? <Link href={signupPath} className="font-semibold text-sky-700 hover:text-sky-800">Create one</Link>
          </p>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              <Link href="/reset-password" className="font-semibold text-sky-700 hover:text-sky-800">Forgot password</Link>
              {" · "}
              <Link href="/verify-email" className="font-semibold text-sky-700 hover:text-sky-800">Verify email</Link>
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {searchParams?.get("registered") === "1" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Registration submitted successfully. Please sign in.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
              placeholder="you@example.com"
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
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Button onClick={handleGoogleSignIn} disabled={loading} variant="outline" className="w-full" size="lg" type="button">
          Continue with Google
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100" />}>
      <LoginContent />
    </Suspense>
  );
}
