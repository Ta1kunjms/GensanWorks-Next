import Link from "next/link";
import { Building2, Briefcase, ShieldCheck, Users } from "lucide-react";

const pillars = [
  {
    title: "Government-backed trust",
    description:
      "GensanWorks operates under the Public Employment Service Office of General Santos City.",
    icon: ShieldCheck,
  },
  {
    title: "Employer partnerships",
    description:
      "We coordinate with private and public employers to open verified opportunities.",
    icon: Building2,
  },
  {
    title: "Jobseeker-first matching",
    description:
      "Profiles, skills, and goals are matched to roles that fit real local demand.",
    icon: Briefcase,
  },
  {
    title: "Community outcomes",
    description:
      "We track placements and support services to improve employment outcomes year-round.",
    icon: Users,
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">About PESO</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
            About GensanWorks
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600">
            GensanWorks is the digital employment bridge of PESO General Santos City, connecting
            jobseekers and employers through verified postings, practical support, and responsive
            matching.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Landing
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Contact PESO
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <pillar.icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
