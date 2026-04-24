"use client";

import Link from "next/link";

export default function SignupError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Signup error</p>
          <h1 className="mt-3 text-3xl font-bold text-white">We could not load signup.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            A runtime error occurred while rendering the signup route. Use try again to reload the page.
          </p>
          <pre className="mt-6 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-red-200">
            {error.message}
          </pre>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => reset()}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Try again
            </button>
            <Link href="/" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
