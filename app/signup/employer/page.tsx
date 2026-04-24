"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { validatePasswordRules } from "@/lib/password-rules";

export default function EmployerSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const livePasswordErrors = formData.password.length
    ? validatePasswordRules(formData.password).errors
    : [];
  const liveConfirmPasswordError =
    formData.confirmPassword.length && formData.password !== formData.confirmPassword
      ? "Passwords do not match"
      : "";

  const setField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    if (!formData.companyName.trim()) nextErrors.companyName = "Company name is required";
    if (!formData.email.trim()) nextErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) nextErrors.email = "Enter a valid email";

    if (!formData.password) nextErrors.password = "Password is required";
    else {
      const validation = validatePasswordRules(formData.password);
      if (!validation.isValid) nextErrors.password = validation.errors[0] || "Invalid password";
    }

    if (!formData.confirmPassword) nextErrors.confirmPassword = "Confirm your password";
    else if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishmentName: formData.companyName.trim(),
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }

      router.push("/login?role=employer&registered=1");
    } catch {
      setError("Unable to submit employer registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Join as an employer and start hiring."
      roleLabel="Employer Portal"
      roleId="employer"
      primaryPortalBaseHref="/signup"
      sideTitle="Hire with clarity"
      sideBullets={[
        "Verified employer onboarding",
        "Structured applicant workflows",
        "PESO-aligned hiring support",
      ]}
      footer={
        <p className="text-sm text-slate-600">
          Already have an account? <Link href="/login?role=employer" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Company name</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-300 focus:ring-2"
                value={formData.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="Your Company Inc."
                aria-invalid={!!fieldErrors.companyName}
                autoComplete="organization"
              />
            </div>
            {fieldErrors.companyName ? <p className="mt-1 text-xs text-red-600">{fieldErrors.companyName}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-300 focus:ring-2"
                value={formData.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="company@example.com"
                aria-invalid={!!fieldErrors.email}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none ring-sky-300 focus:ring-2"
                value={formData.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!fieldErrors.password}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {livePasswordErrors.length ? (
              <div className="mt-1 space-y-1">
                {livePasswordErrors.map((msg) => (
                  <p key={msg} className="text-xs text-red-600">{msg}</p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Use 8+ chars with upper/lowercase, number, and symbol.</p>
            )}
            {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none ring-sky-300 focus:ring-2"
                value={formData.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!fieldErrors.confirmPassword}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!fieldErrors.confirmPassword && liveConfirmPasswordError ? <p className="mt-1 text-xs text-red-600">{liveConfirmPasswordError}</p> : null}
            {fieldErrors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p> : null}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || livePasswordErrors.length > 0 || Boolean(liveConfirmPasswordError)}
          className="w-full"
          size="lg"
        >
          {loading ? "Creating account..." : "Create employer account"}
        </Button>
      </form>
    </AuthShell>
  );
}
