import Link from "next/link";

export default function AdminPortalPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Admin Portal</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Admin access and onboarding
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Administrators can sign in with approved credentials or request admin access for review.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?role=admin" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Admin Login
            </Link>
            <Link href="/signup/admin-request" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Request Admin Access
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
