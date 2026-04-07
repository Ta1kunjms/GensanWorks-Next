export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-4 text-base text-slate-600">
            This page summarizes how GensanWorks handles personal data for job matching and
            employment support activities.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6 lg:px-8">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Data we collect</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Profile data, application history, and contact details needed to provide PESO services.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">How data is used</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Data is used for job matching, employer verification, support workflows, and reporting.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Data protection</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            GensanWorks applies role-based access controls and secure authentication to protect user
            information.
          </p>
        </article>
      </section>
    </main>
  );
}
