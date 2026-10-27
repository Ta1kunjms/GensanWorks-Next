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

// ---------------------------------------------------------------------------
// Shared layout and type scale for the landing sections (landing polish 2026-10-27):
// one section padding, one container, one header style and one card frame.
// ---------------------------------------------------------------------------

/** Vertical padding used by every landing section below the hero. */
export const SECTION_Y = "py-20 md:py-24";

/** Content container used by every landing section. */
export const CONTAINER = "relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

/** Light card frame: one radius, border and shadow; add CARD_HOVER for links. */
export const CARD = "rounded-2xl border border-slate-200 bg-white shadow-sm";

/** Subtle hover for interactive cards: shadow and border only, no scale jumps. */
export const CARD_HOVER =
  "transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-md";

/** Dark card frame used inside light sections (charts, callouts). */
export const CARD_DARK = "rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-sm";

/** Glass card frame used inside dark sections. */
export const CARD_GLASS = "rounded-2xl border border-white/10 bg-white/5";

type Tone = "light" | "dark";

/** Small pill label above a section heading. */
export function Eyebrow({ children, icon: Icon, tone = "light" }: { children: React.ReactNode; icon?: React.ElementType; tone?: Tone }) {
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
        tone === "dark" ? "border-white/15 bg-white/5 text-blue-200" : "border-blue-100 bg-blue-50 text-blue-700"
      }`}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}

/** Gradient accent for one or two words of a section heading. */
export function Accent({ children, tone = "light" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`bg-gradient-to-r bg-clip-text text-transparent ${
        tone === "dark" ? "from-blue-300 to-indigo-300" : "from-blue-600 to-indigo-600"
      }`}
    >
      {children}
    </span>
  );
}

/** Section heading (h2) at the one landing size. */
export function SectionTitle({ id, children, tone = "light", className = "" }: { id: string; children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <h2
      id={id}
      className={`text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl ${
        tone === "dark" ? "text-white" : "text-slate-900"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

/** Lead paragraph under a section heading. */
export function SectionLead({ children, tone = "light", className = "" }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <p className={`text-lg leading-relaxed ${tone === "dark" ? "text-slate-300" : "text-slate-600"} ${className}`}>
      {children}
    </p>
  );
}

/** Eyebrow + h2 + lead, centred or left-aligned, with the shared gap to the content below. */
export function SectionHeader({
  id,
  eyebrow,
  icon,
  title,
  lead,
  tone = "light",
  align = "center",
  className = "",
}: {
  id: string;
  eyebrow: React.ReactNode;
  icon?: React.ElementType;
  title: React.ReactNode;
  lead?: React.ReactNode;
  tone?: Tone;
  align?: "center" | "left";
  className?: string;
}) {
  const centred = align === "center";
  return (
    <div className={`${centred ? "mx-auto text-center" : ""} mb-12 max-w-3xl md:mb-16 ${className}`}>
      <Eyebrow icon={icon} tone={tone}>{eyebrow}</Eyebrow>
      <SectionTitle id={id} tone={tone} className="mt-5">{title}</SectionTitle>
      {lead ? <SectionLead tone={tone} className={`mt-4 max-w-2xl text-balance ${centred ? "mx-auto" : ""}`}>{lead}</SectionLead> : null}
    </div>
  );
}

/**
 * Chart palette shared by the landing charts. Each colour keeps at least 3:1
 * contrast against its card background (white or slate-900).
 */
export const CHART = {
  light: {
    primary: "#2563eb", // blue-600 on white, 5.2:1
    secondary: "#059669", // emerald-600 on white, 3.8:1
    grid: "#e2e8f0",
    tick: "#475569",
    label: "#1e293b",
    cursor: "rgba(37, 99, 235, 0.06)",
  },
  dark: {
    primary: "#60a5fa", // blue-400 on slate-900, 6.9:1
    secondary: "#34d399", // emerald-400 on slate-900, 9.3:1
    grid: "#334155",
    tick: "#cbd5e1",
    label: "#f1f5f9",
    cursor: "rgba(255, 255, 255, 0.06)",
  },
} as const;

/** Tooltip frame shared by the landing charts. */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
  fontSize: 13,
  color: "#0f172a",
};

/** Shortens long category labels on chart axes; the tooltip and table keep the full name. */
export function shortLabel(value: string, max = 34): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
