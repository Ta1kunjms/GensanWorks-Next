"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { validatePasswordRules } from "@/lib/password-rules";

type SignupRole = "jobseeker" | "employer";

function SignupLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<SignupRole>("jobseeker");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const livePasswordErrors = useMemo(
    () => (password.length ? validatePasswordRules(password).errors : []),
    [password],
  );
  const liveConfirmPasswordError = confirmPassword.length && password !== confirmPassword ? "Passwords do not match" : "";

  useEffect(() => {
    const roleParam = searchParams?.get("role");
    if (roleParam === "jobseeker" || roleParam === "employer") {
      setRole(roleParam);
    }
  }, [searchParams]);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const nextErrors: Record<string, string> = {};

    if (role === "jobseeker") {
      if (!firstName.trim()) nextErrors.firstName = "First name is required";
      if (!lastName.trim()) nextErrors.lastName = "Last name is required";
    } else if (!companyName.trim()) {
      nextErrors.companyName = "Company name is required";
    }

    if (!email.trim()) nextErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Enter a valid email";

    if (!password) nextErrors.password = "Password is required";
    else {
      const validation = validatePasswordRules(password);
      if (!validation.isValid) nextErrors.password = validation.errors[0] || "Invalid password";
    }

    if (!confirmPassword) nextErrors.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const endpoint = role === "jobseeker" ? "/api/auth/signup/jobseeker" : "/api/auth/signup/employer";
      const payload =
        role === "jobseeker"
          ? {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              password,
            }
          : {
              establishmentName: companyName.trim(),
              email: email.trim(),
              password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }

      router.push(role === "jobseeker" ? "/login?role=jobseeker&registered=1" : "/login?role=employer&registered=1");
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle={role === "jobseeker" ? "Join as a jobseeker and start applying today." : "Join as an employer and start hiring."}
      roleLabel={`${role.charAt(0).toUpperCase()}${role.slice(1)} Portal`}
      roleId={role}
      primaryPortalBaseHref="/signup"
      sideTitle={role === "jobseeker" ? "Find work with confidence" : "Hire with clarity"}
      sideBullets={
        role === "jobseeker"
          ? ["Verified employers and job postings", "Application tracking and updates", "Support through PESO services"]
          : ["Verified employer access and posting tools", "Streamlined applicant review and tracking", "PESO-aligned referrals and reporting"]
      }
      footer={
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            Need admin access? <Link href="/signup/admin-request" className="font-semibold text-sky-700 hover:text-sky-800">Request here</Link>
          </p>
          <p className="text-slate-600">
            Already have an account? <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {role === "jobseeker" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">First name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearFieldError("firstName");
                  }}
                  placeholder="Juan"
                  autoComplete="given-name"
                />
              </div>
              {fieldErrors.firstName ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.firstName}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Last name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearFieldError("lastName");
                  }}
                  placeholder="Dela Cruz"
                  autoComplete="family-name"
                />
              </div>
              {fieldErrors.lastName ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.lastName}</p> : null}
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Company name</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  clearFieldError("companyName");
                }}
                placeholder="Your Company Inc."
                autoComplete="organization"
              />
            </div>
            {fieldErrors.companyName ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.companyName}</p> : null}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
              placeholder={role === "jobseeker" ? "you@example.com" : "company@example.com"}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.email}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                placeholder="Enter your password"
                autoComplete="new-password"
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
            {livePasswordErrors.length > 0 ? (
              <div className="mt-1 space-y-1">
                {livePasswordErrors.map((msg) => (
                  <p key={msg} className="text-xs font-medium text-red-600">{msg}</p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Use 8+ chars with upper/lowercase, number, and symbol.</p>
            )}
            {fieldErrors.password ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.password}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!fieldErrors.confirmPassword && liveConfirmPasswordError ? (
              <p className="mt-1 text-xs font-medium text-red-600">{liveConfirmPasswordError}</p>
            ) : null}
            {fieldErrors.confirmPassword ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.confirmPassword}</p> : null}
          </div>
        </div>

        <Button type="submit" disabled={loading || livePasswordErrors.length > 0 || Boolean(liveConfirmPasswordError)} className="w-full" size="lg">
          {loading ? "Creating account..." : role === "jobseeker" ? "Create account" : "Create employer account"}
        </Button>
      </form>
    </AuthShell>
  );
}

function SignupPageFallback() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Loading sign up form..."
      roleLabel="Portal"
      roleId="jobseeker"
      sideTitle="Preparing your registration"
      sideBullets={[
        "Secure account creation",
        "Role-based onboarding",
        "PESO-aligned platform support",
      ]}
    >
      <div className="py-8 text-center text-sm text-slate-600">Loading...</div>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupLandingPage />
    </Suspense>
  );
}
