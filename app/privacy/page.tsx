import Link from "next/link";
import { ArrowUpRight, Lock, Scale, ShieldCheck } from "lucide-react";
import { PrivacyToc } from "./privacy-toc";

const infoCollected = [
  "Account details (name, email, contact number)",
  "Profile information for jobseekers and employers",
  "Job postings and application data",
  "System logs (IP address, device/browser information) for security and fraud prevention",
  "Communications with support (messages, inquiries, and responses)",
];

const informationUse = [
  "Provide and improve employment facilitation services",
  "Communicate updates, job matches, and service announcements",
  "Ensure platform security and integrity",
  "Comply with legal obligations and regulatory reporting",
  "Conduct aggregated analytics to improve service delivery (non-identifiable)",
];

const rights = [
  "Right to be informed",
  "Right to object",
  "Right to access",
  "Right to rectify",
  "Right to erasure or blocking",
  "Right to data portability",
  "Right to damages",
];

const sectionLinks = [
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use-information", label: "How We Use Information" },
  { id: "data-sharing", label: "Data Sharing" },
  { id: "your-rights", label: "Your Rights" },
  { id: "legal-bases", label: "Legal Bases" },
  { id: "retention-security", label: "Retention and Security" },
  { id: "children-privacy", label: "Children's Privacy" },
  { id: "dpo-contact", label: "DPO Contact" },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white print:border-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent opacity-70" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Legal</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              This Privacy Policy explains how the City Government of General Santos - PESO collects,
              uses, and protects your personal information in connection with the GensanWorks
              platform, in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173),
              its Implementing Rules and Regulations (IRR), and relevant National Privacy Commission
              (NPC) issuances.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 print:hidden">
              <a
                href="https://privacy.gov.ph/data-privacy-act/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Data Privacy Act
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
              <a
                href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Read IRR
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </div>
            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3 print:mt-4 print:border-slate-300">
              <p>
                <span className="font-semibold text-slate-900">Policy version:</span> 2.0
              </p>
              <p>
                <span className="font-semibold text-slate-900">Last updated:</span> April 20, 2026
              </p>
              <p>
                <span className="font-semibold text-slate-900">Jurisdiction:</span> Philippines (DPA 2012)
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-8 sm:px-6 lg:grid-cols-3 lg:px-8 print:hidden">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Security Commitment</h2>
          <p className="mt-2 text-sm text-slate-600">
            We apply controls designed to protect personal data against unauthorized access,
            alteration, and misuse.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Scale className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Lawful Processing</h2>
          <p className="mt-2 text-sm text-slate-600">
            Processing is limited to valid legal bases such as consent, public mandate, and legal
            compliance.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Your Rights First</h2>
          <p className="mt-2 text-sm text-slate-600">
            You can request access, correction, and other lawful controls over your personal data.
          </p>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">On this page</h2>
            <PrivacyToc sections={sectionLinks} />
          </div>
        </aside>

        <div className="space-y-6">
        <article id="information-we-collect" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">Information We Collect</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
            {infoCollected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article id="how-we-use-information" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">How We Use Information</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
            {informationUse.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article id="data-sharing" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">Data Sharing</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
            We may share data with authorized government agencies and partner employers strictly for
            employment facilitation purposes, subject to applicable laws and data protection
            standards. Any sharing is governed by data sharing agreements, confidentiality clauses,
            and safeguards consistent with NPC Circulars and the DPA 2012 IRR. We do not sell
            personal data.
          </p>
          <a
            href="https://privacy.gov.ph/npc-circular-16-01-security-of-personal-data-in-government-agencies/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            View NPC Circular Reference
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </a>
        </article>

        <article id="your-rights" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">
            Your Rights Under the Data Privacy Act
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rights.map((right) => (
              <div key={right} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">{right}</p>
              </div>
            ))}
          </div>
        </article>

        <article id="legal-bases" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">Legal Bases for Processing</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
            <li>Consent for optional features and communications</li>
            <li>Performance of a public mandate and legitimate interests in employment facilitation</li>
            <li>Compliance with legal obligations and regulatory requirements</li>
          </ul>
        </article>

        <article id="retention-security" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">Data Retention and Security Measures</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
            We retain personal data only as long as necessary to fulfill policy purposes, legal
            requirements, and dispute resolution. When no longer needed, data is securely deleted or
            anonymized.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-700 sm:text-base">
            <li>Access controls and role-based permissions</li>
            <li>Encryption in transit (HTTPS) and secure storage practices</li>
            <li>Audit logging, secure development lifecycle, and periodic reviews</li>
          </ul>
        </article>

        <article id="children-privacy" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">Children&apos;s Privacy</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
            The platform is intended for individuals of legal working age. If data from minors is
            collected without appropriate consent, we will take steps to delete such information.
          </p>
        </article>

        <article id="dpo-contact" className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white print:shadow-none">
          <h2 className="text-2xl font-bold text-slate-900">Contact and Data Protection Officer</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700 sm:text-base">
            <li>
              Email: <a href="mailto:peso_gensan@yahoo.com" className="font-semibold text-blue-700">peso_gensan@yahoo.com</a>
            </li>
            <li>
              Phone: <a href="tel:+63835533479" className="font-semibold text-blue-700">(083) 553 3479</a>
            </li>
            <li>Address: 4th Flr. GSC Investment Action Center Building, City Hall Compound, GSC</li>
            <li>
              NPC support: <a href="https://privacy.gov.ph/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700">privacy.gov.ph</a>
            </li>
          </ul>
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
        </div>
      </section>
    </main>
  );
}
