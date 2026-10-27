"use client";

// Small helpers shared by the landing sections that show /api/public/labor-market data.

import React, { useEffect, useState } from "react";
import { formatCount, formatPeso } from "@/lib/utils";

/**
 * A number for display. Missing values show "—" visually and "Not available" to
 * screen readers (a bare dash is read as "em dash").
 */
export function Figure({ value, kind = "count" }: { value: number | null | undefined; kind?: "count" | "percent" | "peso" }) {
  const text =
    value === null || value === undefined || !Number.isFinite(value)
      ? "—"
      : kind === "percent"
        ? `${value.toLocaleString("en-PH", { maximumFractionDigits: 1 })}%`
        : kind === "peso"
          ? formatPeso(value).replace(/\.00$/, "")
          : formatCount(value);
  if (text === "—") {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not available</span>
      </>
    );
  }
  return <>{text}</>;
}

/** "23 October 2026" for an ISO timestamp; null when missing or invalid. */
export function formatAsOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });
}

export function AsOfNote({ asOf, className = "" }: { asOf?: string | null; className?: string }) {
  const label = formatAsOf(asOf);
  if (!label) return null;
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      Figures from GensanWorks records as of {label}.
    </p>
  );
}

/** Tracks the user's reduced-motion preference (false during SSR). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Message shown in place of a data block when the labour-market request failed. */
export function DataUnavailable({ dark = false }: { dark?: boolean }) {
  return (
    <p className={`py-10 text-center text-sm font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>
      Labour-market figures are unavailable right now. Please try again later.
    </p>
  );
}
