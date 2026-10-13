import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PrivacyToc } from "./privacy-toc";
import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy-notice-version";

const futureDataCategories = [
  "Account and contact details (name, email, contact number)",
  "Profile information for jobseekers and employers",
  "Job postings and application records",
  "Basic technical/system logs for security purposes",
];

const futureUses = [
  "Operating and evaluating the controlled-pilot job-matching and referral features",
  "Research and system evaluation for the capstone/academic project",
  "Not sold, and not used for purposes unrelated to the pilot's stated scope",
];

const pendingApprovalItems = [
  "Final data retention period",
  "Final deletion / anonymization procedure",
  "Designation of a data controller / Data Protection Officer",
  "Any external processor or data-sharing arrangements",
  "Authorization to run a real-data controlled pilot",
];

const doesNotClaim = [
  "No compliance certification is claimed",
  "No completed ethics clearance is claimed",
  "No production deployment is claimed",
  "No multi-factor authentication (MFA) is claimed",
  "No complete database-level access-control (RLS) coverage is claimed",
  "No finalized external-provider or data-sharing agreements are claimed",
];

const sectionLinks = [
  { id: "current-vs-future", label: "Current vs. Future State" },
  { id: "synthetic-data-only", label: "Synthetic Data Only" },
  { id: "purpose", label: "Purpose of This Work" },
  { id: "future-data-categories", label: "Future Data Categories" },
  { id: "future-uses", label: "Future Uses" },
  { id: "pending-approval", label: "Pending Institutional Approval" },
  { id: "does-not-claim", label: "What This Draft Does Not Claim" },
  { id: "questions", label: "Questions" },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white print:border-0">
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              Controlled-Pilot Privacy Notice — Development Draft
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Controlled-Pilot Privacy Notice (Development Draft)
            </h1>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 sm:text-base">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <p>
                This is a development draft for synthetic-data-only preparation. It is not a
                finalized legal notice and has not yet been approved by PESO&ndash;General Santos
                City or Mindanao State University&ndash;General Santos.
              </p>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2 print:border-slate-300">
              <p>
                <span className="font-semibold text-slate-900">Draft version:</span>{" "}
                {PRIVACY_NOTICE_VERSION}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Status:</span> Pending institutional
                review (not yet approved)
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">On this page</h2>
            <PrivacyToc sections={sectionLinks} />
          </div>
        </aside>

        <div className="space-y-6">
          <article
            id="current-vs-future"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">Current vs. Future State</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Current state</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Synthetic-data-only development and preparation. You are not currently
                  participating in an active controlled pilot involving real personal data.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Future state</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  A controlled pilot involving real participant/personal data would only begin
                  after PESO authorization, required MSU ethics/privacy approval, a verified
                  technical-security configuration, and an approved final privacy notice are all
                  in place.
                </p>
              </div>
            </div>
          </article>

          <article
            id="synthetic-data-only"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">Synthetic Data Only</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-red-800 sm:text-base">
              Do not enter real TINs, government IDs, sensitive employment records, or other
              personal information during current synthetic-data testing.
            </p>
          </article>

          <article
            id="purpose"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">Purpose of This Work</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              GensanWorks is being developed and tested as a capstone/academic prototype for an
              AI-assisted job-matching and referral system intended, in a future controlled pilot,
              to support PESO&ndash;General Santos City. At this stage, the system is used only
              with synthetic (made-up) data for development and testing.
            </p>
          </article>

          <article
            id="future-data-categories"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              Broad Categories of Information Intended for a Future Pilot
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              If a real-data controlled pilot is later authorized, the system is intended to
              collect broad categories of information such as:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
              {futureDataCategories.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article
            id="future-uses"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              Broad Intended Uses in a Future Pilot
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
              {futureUses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article
            id="pending-approval"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              What Remains Subject to Institutional Approval
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              The following are not yet finalized or verified, and remain subject to
              institutional review and approval before any real-data pilot:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
              {pendingApprovalItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article
            id="does-not-claim"
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">What This Draft Does Not Claim</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
              {doesNotClaim.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article
            id="questions"
            className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white print:shadow-none"
          >
            <h2 className="text-2xl font-bold text-slate-900">Questions or Concerns</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              For questions about this development draft, please use the contact form below.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 print:hidden">
              <Link
                href="/contact"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Contact Helpdesk
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back to Home
              </Link>
            </div>
          </article>

          <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-900">
            Development draft &mdash; pending PESO/MSU review and approval.
          </p>
        </div>
      </section>
    </main>
  );
}
