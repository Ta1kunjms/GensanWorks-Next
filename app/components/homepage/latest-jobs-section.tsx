"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Building2, ChevronRight, Briefcase } from "lucide-react";
import type { LatestJob } from "@/lib/labor-market";
import { Accent, CARD, CARD_HOVER, CONTAINER, DataUnavailable, Eyebrow, SECTION_Y, SectionLead, SectionTitle, formatAsOf } from "./landing-shared";

interface LatestJobsSectionProps {
  jobs?: LatestJob[];
  loading?: boolean;
  failed?: boolean;
}

const gradients = ["from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-indigo-500 to-violet-600"];

// The six newest open job posts. Job pages are behind jobseeker sign-in,
// so the cards say so and link to the existing jobseeker job route.
export function LatestJobsSection({ jobs = [], loading = false, failed = false }: LatestJobsSectionProps) {
  return (
    <section aria-labelledby="latest-jobs-heading" className={`relative w-full bg-white ${SECTION_Y}`}>
      <div className={CONTAINER}>
        <div className="mb-12 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Eyebrow icon={Briefcase}>Just Posted</Eyebrow>
            <SectionTitle id="latest-jobs-heading" className="mt-5">
              Latest Job <Accent>Openings</Accent>
            </SectionTitle>
          </div>
          <div className="max-w-md space-y-3">
            <SectionLead>
              The newest open posts from approved employers. Sign in as a jobseeker to view details and apply.
            </SectionLead>
            <Link href="/jobs" className="inline-flex min-h-11 items-center gap-1 font-semibold text-blue-700 hover:underline">
              Browse Jobs
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${CARD} h-60 motion-safe:animate-pulse`} />
            ))}
          </div>
        ) : failed ? (
          <DataUnavailable />
        ) : jobs.length === 0 ? (
          <p className="py-16 text-center text-lg font-medium text-slate-600">No open job posts right now.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, index) => {
              const posted = formatAsOf(job.postedAt);
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobseeker/jobs/${job.id}`}
                    className={`group flex h-full flex-col overflow-hidden ${CARD} ${CARD_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                  >
                    <div aria-hidden="true" className={`h-1.5 w-full bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                    <div className="flex flex-grow flex-col p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {job.sector}
                        </span>
                        {posted ? <span className="shrink-0 text-xs font-medium text-slate-600 tabular-nums">{posted}</span> : null}
                      </div>

                      <h3 className="text-balance text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-700">
                        {job.title}
                      </h3>

                      <p className="mt-2 mb-6 flex items-center gap-2 text-base text-slate-600">
                        <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">{job.employer ?? "Employer not listed"}</span>
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600">
                          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {[job.city, job.workSetup].filter(Boolean).join(" · ") || "Location not listed"}
                          </span>
                        </div>
                        <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 transition-colors group-hover:bg-blue-50">
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-700 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
