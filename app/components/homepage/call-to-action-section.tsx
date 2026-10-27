"use client";

import Link from "next/link";
import { Users, Building2, Briefcase, ArrowRight } from "lucide-react";
import type { LaborMarketResponse } from "@/lib/labor-market";
import { CONTAINER, Eyebrow, Figure, SECTION_Y, SectionTitle } from "./landing-shared";

interface CallToActionSectionProps {
  totals?: LaborMarketResponse["totals"];
}

// Next-steps call to action. The highlight tiles show real totals from
// /api/public/labor-market ("—" when unavailable). The FAQ moved to
// faq-section.tsx and the newsletter form was removed (no backend exists).
export function CallToActionSection({ totals }: CallToActionSectionProps) {
  const highlights = [
    { label: "Registered jobseekers", value: totals?.jobseekers, icon: Users },
    { label: "Approved employers", value: totals?.employers, icon: Building2 },
    { label: "Open vacancies", value: totals?.openVacancies, icon: Briefcase },
  ];

  return (
    <section aria-labelledby="cta-heading" className={`relative w-full overflow-hidden bg-slate-50 ${SECTION_Y}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className={CONTAINER}>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-6 text-white shadow-xl sm:p-10 md:p-14 lg:p-16">
          {/* Glossy overlay */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay" />
          <div aria-hidden="true" className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60 pointer-events-none" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="min-w-0">
              <Eyebrow tone="dark">Next Steps</Eyebrow>

              <SectionTitle id="cta-heading" tone="dark" className="mt-5">
                Ready to take the <span className="bg-gradient-to-r from-blue-200 to-emerald-200 bg-clip-text text-transparent">next step?</span>
              </SectionTitle>

              <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-blue-50">
                Whether you&apos;re a jobseeker or an employer, GensanWorks keeps applications, referrals
                and hiring updates in one place, with PESO General Santos City supporting each step.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup/jobseeker" className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-blue-700 transition-shadow duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700">
                  Start as Jobseeker
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                <Link href="/signup/employer" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-8 text-base font-semibold text-white transition-colors duration-200 hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Start as Employer
                </Link>
              </div>
            </div>

            <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
              {highlights.map((item, i) => (
                <li
                  key={item.label}
                  className={`rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl sm:p-6 ${i === 2 ? "sm:col-span-2" : ""}`}
                >
                  <div aria-hidden="true" className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                    <item.icon className="h-5 w-5 text-blue-100" />
                  </div>
                  <p className="text-sm font-semibold text-blue-50">{item.label}</p>
                  <div className="mt-1 text-3xl font-bold text-white tabular-nums">
                    <Figure value={item.value} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
