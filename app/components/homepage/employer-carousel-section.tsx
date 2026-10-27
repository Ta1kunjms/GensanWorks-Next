"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from "react";
import { Building2, Pause, Play, ShieldCheck, Lock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CarouselEmployer } from "@/lib/labor-market";
import { CARD, CONTAINER, SECTION_Y, SectionHeader, usePrefersReducedMotion } from "./landing-shared";

interface EmployerCarouselSectionProps {
  employers?: CarouselEmployer[];
  loading?: boolean;
  failed?: boolean;
}

// Replaces the old hard-coded partner marquee: only approved, active employers
// from the database (owner decision 2026-10-23). Scrolling pauses on hover or
// keyboard focus, has a visible pause button (WCAG 2.2.2), and is off when the
// user prefers reduced motion.

const trustSignals = [
  { title: "PESO-reviewed", description: "Employer accounts approved by PESO staff", icon: ShieldCheck, accent: "bg-blue-50 text-blue-700" },
  { title: "Consent first", description: "Jobseeker data used with consent", icon: Lock, accent: "bg-emerald-50 text-emerald-700" },
  { title: "People decide", description: "AI suggests, PESO and employers decide", icon: UserCheck, accent: "bg-indigo-50 text-indigo-700" },
];

// Soft fade at both edges of the scrolling strip.
const EDGE_FADE = "[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /[A-Za-z0-9]/.test(part))
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function EmployerLogo({ employer }: { employer: CarouselEmployer }) {
  const [broken, setBroken] = useState(false);
  if (employer.logo && !broken) {
    return <img src={employer.logo} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />;
  }
  return <span className="text-sm font-bold text-slate-700">{initials(employer.name) || <Building2 className="w-5 h-5" />}</span>;
}

function EmployerCard({ employer }: { employer: CarouselEmployer }) {
  const detail = [employer.industry, employer.city].filter(Boolean).join(" · ");
  return (
    <div className={`${CARD} flex h-20 w-64 items-center gap-3 px-4`}>
      <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        <EmployerLogo employer={employer} />
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold text-slate-900">{employer.name}</p>
        {detail ? <p className="truncate text-xs text-slate-600">{detail}</p> : null}
      </div>
    </div>
  );
}

export function EmployerCarouselSection({ employers = [], loading = false, failed = false }: EmployerCarouselSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const animate = !reducedMotion && employers.length > 3;
  const running = animate && !userPaused && !hoverPaused;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !running) return;
    let frame = 0;
    const step = () => {
      track.scrollLeft += 1;
      if (track.scrollLeft >= track.scrollWidth / 2) track.scrollLeft = 0;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <section aria-labelledby="employers-heading" className={`relative w-full border-y border-slate-200 bg-white ${SECTION_Y}`}>
      <div className={CONTAINER}>
        {/* Trust Signals */}
        <ul className="mb-16 grid gap-4 sm:grid-cols-3 md:mb-20">
          {trustSignals.map((signal) => (
            <li key={signal.title} className="flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${signal.accent}`}>
                <signal.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">{signal.title}</p>
                <p className="text-sm text-slate-600">{signal.description}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Employer Network Header */}
        <SectionHeader
          id="employers-heading"
          eyebrow="Employers on GensanWorks"
          icon={Building2}
          title="Approved employers hiring through PESO"
        />

        {/* Employer carousel */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden motion-safe:animate-pulse" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 w-64 shrink-0 rounded-2xl border border-slate-200 bg-slate-50" />
            ))}
          </div>
        ) : failed ? (
          <p className="py-6 text-center text-base font-medium text-slate-600">The employer list is unavailable right now.</p>
        ) : employers.length === 0 ? (
          <p className="py-6 text-center text-base font-medium text-slate-600">No approved employers listed yet.</p>
        ) : (
          <div className="space-y-4">
            <div
              ref={trackRef}
              // No gap between the two copies (each list ends with pr-4), so half the scroll width is exactly one loop.
              className={`flex py-2 ${animate ? `overflow-hidden ${EDGE_FADE}` : "overflow-x-auto"}`}
              style={{ scrollbarWidth: "none" }}
              // Without auto-scroll the list scrolls by hand, so the region must be keyboard-focusable.
              tabIndex={animate ? undefined : 0}
              role={animate ? undefined : "region"}
              aria-label={animate ? undefined : "Approved employers, scroll horizontally"}
              onMouseEnter={() => setHoverPaused(true)}
              onMouseLeave={() => setHoverPaused(false)}
              onFocus={() => setHoverPaused(true)}
              onBlur={() => setHoverPaused(false)}
            >
              <ul className="flex shrink-0 gap-4 pr-4" aria-label={`${employers.length} approved employers`}>
                {employers.map((employer) => (
                  <li key={employer.id}>
                    <EmployerCard employer={employer} />
                  </li>
                ))}
              </ul>
              {animate ? (
                // Second copy makes the loop seamless; hidden from assistive technology.
                <ul className="flex shrink-0 gap-4 pr-4" aria-hidden="true">
                  {employers.map((employer) => (
                    <li key={`${employer.id}-copy`}>
                      <EmployerCard employer={employer} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {animate ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setUserPaused((paused) => !paused)}
                  className="min-h-11 rounded-xl px-4 text-slate-700 hover:bg-slate-100"
                >
                  {userPaused ? <Play className="mr-2 h-4 w-4" aria-hidden="true" /> : <Pause className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {userPaused ? "Resume scrolling" : "Pause scrolling"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
