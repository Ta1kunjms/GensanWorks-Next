"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

type ConsentAction = "accept" | "decline";

export default function GoogleConsentPage() {
  const router = useRouter();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState<ConsentAction | null>(null);
  const [error, setError] = useState("");

  const submit = async (action: ConsentAction) => {
    setError("");
    if (action === "accept" && !consentAccepted) {
      setError("You must acknowledge the Privacy Notice to continue.");
      return;
    }

    setLoading(action);
    try {
      const response = await fetch("/api/auth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
      roleLabel="Jobseeker Portal"
      roleId="jobseeker"
      sideTitle="Why we ask"
      sideBullets={[
        "Your account is only activated after you give consent",
        "You can decline; your profile will be deactivated",
        "You can return later and accept to continue",
      ]}
      showPrimaryPortals={false}
      showAdminPortalButton={false}
    >
      <div className="space-y-5">
        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              id="consentAccepted"
              checked={consentAccepted}
              onChange={(e) => {
                setConsentAccepted(e.target.checked);
                setError("");
              }}
              aria-required="true"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-300"
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
        </div>

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
      </div>
    </AuthShell>
  );
}
