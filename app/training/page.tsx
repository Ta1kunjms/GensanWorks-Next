import Link from "next/link";
import { GraduationCap, Wrench, Briefcase } from "lucide-react";

const programs = [
  {
    title: "Resume and interview bootcamp",
    detail: "Practical job readiness sessions for first-time applicants.",
    icon: Briefcase,
  },
  {
    title: "Digital and office skills track",
    detail: "Upskilling path for admin, support, and tech-adjacent roles.",
    icon: GraduationCap,
  },
  {
    title: "Technical trades workshop",
    detail: "Hands-on preparation aligned with local industry hiring demand.",
    icon: Wrench,
  },
];

export default function TrainingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Training</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Career Training Programs</h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600">
            PESO-supported programs that help jobseekers build in-demand capabilities.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        {programs.map((program) => (
          <article key={program.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <program.icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{program.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{program.detail}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Join as a jobseeker</h2>
          <p className="mt-2 text-sm text-slate-600">
            Create your account and start receiving recommendations for training and vacancies.
          </p>
          <div className="mt-5">
            <Link href="/signup/jobseeker" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Create Jobseeker Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
