import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

const contactItems = [
  {
    label: "Office Address",
    value: "General Santos City, South Cotabato",
    icon: MapPin,
  },
  {
    label: "Phone",
    value: "+63 283 889 5200",
    icon: Phone,
  },
  {
    label: "Email",
    value: "admin@gensanworks.com",
    icon: Mail,
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Contact</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Contact PESO Helpdesk</h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600">
            Reach the GensanWorks team for account assistance, employer onboarding, and jobseeker
            support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {contactItems.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{item.label}</h2>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Need quick access?</h2>
          <p className="mt-2 text-sm text-slate-600">Use the role-specific sign-up or login pages below.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login?role=jobseeker" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Jobseeker Login
            </Link>
            <Link href="/signup/employer" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Employer Sign Up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
