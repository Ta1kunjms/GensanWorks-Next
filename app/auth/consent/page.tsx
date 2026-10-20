"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { parseOAuthRole } from "@/lib/google-consent";

type ConsentAction = "accept" | "decline";

function GoogleConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The server ignores this for users who already have a profile.
  const role = parseOAuthRole(searchParams?.get("role"));
  const isEmployer = role === "employer";
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [establishmentName, setEstablishmentName] = useState("");
  const [loading, setLoading] = useState<ConsentAction | null>(null);
  const [error, setError] = useState("");

  const submit = async (action: ConsentAction) => {
    setError("");
    if (action === "accept" && !consentAccepted) {
      setError("You must acknowledge the Privacy Notice to continue.");
      return;
    }
    if (action === "accept" && isEmployer && establishmentName.trim().length < 2) {
      setError("Enter your establishment name to create an employer account.");
      return;
    }

    setLoading(action);
    try {
      const response = await fetch("/api/auth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEmployer ? { action, role, establishmentName: establishmentName.trim() } : { action, role }
        ),
      });
      const data = (await response.json()) as {
        data?: { redirectTo?: string };
        error?: string;
      };

      if (!response.ok || !data.data?.redirectTo) {
        setError(data.error ?? "Unable to save your choice. Please try again.");
        return;
      }

      router.replace(data.data.redirectTo);
      router.refresh();
    } catch {
      setError("Unable to save your choice. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <AuthShell
      title="Privacy consent required"
      subtitle="Before you continue with your Google account, please review and acknowledge the Privacy Notice."
      roleLabel={isEmployer ? "Employer Portal" : "Jobseeker Portal"}
      roleId={role}
      sideTitle="Why we ask"
      sideBullets={
        isEmployer
          ? [
              "Your employer account is only created after you give consent",
              "PESO reviews and approves new employer accounts",
              "You can decline; no account is kept",
            ]
          : [
              "Your account is only activated after you give consent",
              "You can decline; your profile will be deactivated",
              "You can return later and accept to continue",
            ]
      }
      showPrimaryPortals={false}
      showAdminPortalButton={false}
    >
      <div className="space-y-5">
        {isEmployer ? (
          <div>
            <label htmlFor="establishment-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Establishment name <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="establishment-name"
                type="text"
                value={establishmentName}
                onChange={(e) => {
                  setEstablishmentName(e.target.value);
                  setError("");
                }}
                maxLength={200}
                required
                aria-required="true"
                placeholder="Registered business or company name"
                className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => submit("accept")}
          disabled={loading !== null || !consentAccepted}
          className="w-full"
          size="lg"
        >
          {loading === "accept" ? "Saving..." : "Accept and continue"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => submit("decline")}
          disabled={loading !== null}
          className="w-full"
          size="lg"
        >
          {loading === "decline" ? "Signing out..." : "Decline and sign out"}
        </Button>

        <div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              id="privacy-ack"
              checked={consentAccepted}
              onChange={(e) => {
                setConsentAccepted(e.target.checked);
                setError("");
              }}
              aria-required="true"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-sky-600 focus:ring-2 focus:ring-sky-300"
            />
            <span>
              I have read the{" "}
              <Link href="/privacy" className="font-semibold text-sky-700 underline hover:text-sky-800">
                Privacy Notice
              </Link>{" "}
              and understand that this prototype is currently in synthetic-data-only development
              mode. I will not enter real TINs, government-issued identification numbers, or
              sensitive personal/employment information. Any future controlled pilot involving real
              personal data will require prior PESO authorization, applicable MSU ethics/privacy
              approval, and an approved final privacy notice.{" "}
              <span className="font-semibold text-red-600" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </span>
          </label>
          {!consentAccepted ? (
            <p className="mt-2 pl-7 text-xs text-slate-500">Tick the box to enable “Accept and continue”.</p>
          ) : null}
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}

export default function GoogleConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f7fc]" />}>
      <GoogleConsentContent />
    </Suspense>
  );
}
