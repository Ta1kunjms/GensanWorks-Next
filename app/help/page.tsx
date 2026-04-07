import Link from "next/link";

const helpTopics = [
  {
    title: "Account setup",
    detail: "Create your profile, verify your details, and prepare your job preferences.",
  },
  {
    title: "Applications",
    detail: "Track status updates, review interview notes, and keep your resume up to date.",
  },
  {
    title: "Employer onboarding",
    detail: "Submit business documents and publish verified vacancies with guidance.",
  },
  {
    title: "Technical support",
    detail: "Report access issues or account errors to the PESO helpdesk.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Help and Support</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600">
            Find quick guidance for jobseekers and employers using the GensanWorks platform.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        {helpTopics.map((topic) => (
          <article key={topic.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">{topic.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{topic.detail}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Accessibility statement</h2>
          <p className="mt-2 text-sm text-slate-600">
            GensanWorks aims to be accessible on desktop and mobile. If you experience any
            accessibility barriers, please contact the PESO helpdesk.
          </p>
          <div className="mt-5">
            <Link href="/contact" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
