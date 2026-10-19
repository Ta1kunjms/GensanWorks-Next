"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorDetailsPanel } from "@/components/error-details-panel";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Error 500</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Something went wrong.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            This page ran into a problem and could not load. Please try again. If it keeps happening, contact PESO
            General Santos City and mention the time it occurred.
          </p>
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
          <ErrorDetailsPanel kind="Runtime error" message={error.message} digest={error.digest} stack={error.stack} />
        </div>
      </div>
    </div>
  );
}
