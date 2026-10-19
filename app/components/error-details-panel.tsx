"use client";

import { useEffect, useState } from "react";

interface ErrorDetailsPanelProps {
  kind: string;
  message?: string;
  digest?: string;
  stack?: string;
}

// Collapsed technical details for developers. The stack trace is only shown
// outside production so internal file paths are not exposed to the public.
export function ErrorDetailsPanel({ kind, message, digest, stack }: ErrorDetailsPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState({ path: "", time: "" });
  const showStack = process.env.NODE_ENV !== "production" && Boolean(stack);

  useEffect(() => {
    setContext({ path: window.location.pathname + window.location.search, time: new Date().toISOString() });
  }, []);

  const report = [
    `Type: ${kind}`,
    `Path: ${context.path}`,
    `Time: ${context.time}`,
    digest ? `Error ID: ${digest}` : null,
    message ? `Message: ${message}` : null,
    showStack ? `Stack:\n${stack}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the details remain selectable on screen.
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
      >
        {open ? "Hide technical details" : "Are you the developer? Show technical details"}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-red-200">
            {report}
          </pre>
          <button
            type="button"
            onClick={() => void copyReport()}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
          >
            {copied ? "Copied" : "Copy details"}
          </button>
        </div>
      )}
    </div>
  );
}
