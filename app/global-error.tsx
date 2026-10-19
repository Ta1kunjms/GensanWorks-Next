"use client";

import { ErrorDetailsPanel } from "@/components/error-details-panel";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Critical System Error</p>
            <h1 className="mt-3 text-3xl font-bold text-white">The application crashed.</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              GensanWorks could not start this page. This may be a temporary service outage. Please try again in a
              moment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => reset()}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Go home
              </button>
            </div>
            <ErrorDetailsPanel kind="Critical error (root layout)" message={error.message} digest={error.digest} stack={error.stack} />
          </div>
        </div>
      </body>
    </html>
  );
}
