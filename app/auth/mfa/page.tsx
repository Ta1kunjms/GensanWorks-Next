"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";

type Mode = "loading" | "enroll" | "verify";

type Enrollment = { factorId: string; qrCode: string; secret: string };

const CODE_PATTERN = /^\d{6}$/;

// Admin two-step verification (TOTP). Admin portal pages and admin APIs require
// an aal2 session; see app/lib/admin-mfa.ts.
export default function AdminMfaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login/admin");
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace("/admin/dashboard");
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listError) {
        setError("Unable to load your verification settings. Refresh the page to try again.");
        setMode("verify");
        return;
      }

      const verified = factors.totp.find((factor) => factor.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMode("verify");
        return;
      }

      // Remove abandoned, unverified enrollments before starting a new one.
      for (const factor of factors.all) {
        if (factor.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "GensanWorks admin",
      });
      if (cancelled) return;
      if (enrollError || !enrolled) {
        setError("Unable to start authenticator setup. Refresh the page to try again.");
        setMode("enroll");
        return;
      }
      setFactorId(enrolled.id);
      setEnrollment({ factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret });
      setMode("enroll");
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const trimmed = code.trim();
    if (!CODE_PATTERN.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (!factorId) {
      setError("Verification is not ready yet. Refresh the page to try again.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: trimmed });
      if (verifyError) {
        setError("That code did not work. Check the time on your device and try a new code.");
        return;
      }
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to verify the code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login/admin");
  };

  return (
    <AuthShell
      title={mode === "enroll" ? "Set up two-step verification" : "Two-step verification"}
      subtitle={
        mode === "enroll"
          ? "Admin accounts need an authenticator app. Scan the code, then enter the 6-digit code it shows."
          : "Enter the 6-digit code from your authenticator app to open the admin console."
      }
      roleLabel="Admin Portal"
      roleId="admin"
      sideTitle="Admin-only access"
      sideBullets={[
        "Every admin sign-in needs a code from an authenticator app",
        "Works with Google Authenticator, Microsoft Authenticator, or similar apps",
        "Lost your device? Ask the system owner to reset your verification",
      ]}
      showPrimaryPortals={false}
      showAdminPortalButton
      footer={
        <p className="text-sm text-slate-600">
          Not you?{" "}
          <Button type="button" variant="link" onClick={handleSignOut} className="h-auto p-0 font-semibold">
            Sign out
          </Button>
        </p>
      }
    >
      {mode === "loading" ? (
        <p role="status" className="text-sm text-slate-600">
          Loading verification settings…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {mode === "enroll" && enrollment ? (
            <div className="space-y-3">
              {/* Supabase returns the QR code as an SVG data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt="QR code for adding GensanWorks to your authenticator app"
                width={176}
                height={176}
                className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2"
              />
              <p className="text-sm text-slate-600">
                Can&apos;t scan? Enter this key in the app:{" "}
                <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">
                  {enrollment.secret}
                </code>
              </p>
            </div>
          ) : null}

          <div>
            <label htmlFor="mfa-code" className="mb-2 block text-sm font-medium text-slate-700">
              6-digit code
            </label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-invalid={Boolean(error)}
              className="w-full rounded-lg border border-input px-4 py-2.5 text-sm tracking-widest text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <Button type="submit" className="w-full" loading={submitting}>
            Verify and continue
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
