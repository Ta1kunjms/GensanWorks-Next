"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from "react";
import { Building2, Pause, Play, ShieldCheck, Lock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CarouselEmployer } from "@/lib/labor-market";
import { usePrefersReducedMotion } from "./landing-shared";

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
  { title: "Consent first", description: "Jobseeker data used with consent", icon: Lock, accent: "bg-blue-50 text-blue-700" },
  { title: "People decide", description: "AI suggests, PESO and employers decide", icon: UserCheck, accent: "bg-slate-100 text-slate-700" },
];

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
    <div className="min-w-[240px] max-w-[280px] rounded-2xl border border-slate-100 bg-white px-5 py-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div aria-hidden="true" className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
        <EmployerLogo employer={employer} />
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{employer.name}</p>
        {detail ? <p className="text-xs text-slate-600 truncate">{detail}</p> : null}
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
    <section aria-labelledby="employers-heading" className="relative w-full bg-white border-y border-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Trust Signals */}
        <ul className="flex flex-wrap items-center justify-center gap-6">
          {trustSignals.map((signal) => (
            <li
              key={signal.title}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-3"
            >
              <div aria-hidden="true" className={`w-11 h-11 rounded-xl flex items-center justify-center ${signal.accent}`}>
                <signal.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                <p className="text-xs text-slate-600">{signal.description}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Employer Network Header */}
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.4em] mb-3">
            Employers on GensanWorks
          </p>
          <h2 id="employers-heading" className="text-2xl font-bold text-slate-900">
            Approved employers hiring through PESO
          </h2>
        </div>

        {/* Employer carousel */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden motion-safe:animate-pulse" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="min-w-[220px] h-20 bg-slate-50 rounded-2xl border border-slate-100" />
            ))}
          </div>
        ) : failed ? (
          <p className="py-6 text-center text-sm font-medium text-slate-600">The employer list is unavailable right now.</p>
        ) : employers.length === 0 ? (
          <p className="py-6 text-center text-sm font-medium text-slate-600">No approved employers listed yet.</p>
        ) : (
          <div className="space-y-3">
            <div
              ref={trackRef}
              className={`flex gap-4 pb-2 ${animate ? "overflow-hidden" : "overflow-x-auto"}`}
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
              <ul className="flex gap-4" aria-label={`${employers.length} approved employers`}>
                {employers.map((employer) => (
                  <li key={employer.id}>
                    <EmployerCard employer={employer} />
                  </li>
                ))}
              </ul>
              {animate ? (
                // Second copy makes the loop seamless; hidden from assistive technology.
                <ul className="flex gap-4" aria-hidden="true">
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
                  size="sm"
                  onClick={() => setUserPaused((paused) => !paused)}
                  className="text-slate-600"
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
