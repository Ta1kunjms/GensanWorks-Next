"use client";

import Link from "next/link";
import { Users, Building2, Briefcase } from "lucide-react";
import type { LaborMarketResponse } from "@/lib/labor-market";
import { Figure } from "./landing-shared";

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
    <section aria-labelledby="cta-heading" className="w-full bg-slate-50 py-32 relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white p-10 md:p-16 lg:p-20 shadow-2xl border border-white/10">
          {/* Glossy overlay */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay" />
          <div aria-hidden="true" className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60 pointer-events-none" />

          <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  Next Steps
                </span>
              </div>

              <h2 id="cta-heading" className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Ready to take the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-emerald-200">next step?</span>
              </h2>

              <p className="text-blue-50 text-lg leading-relaxed max-w-xl">
                Whether you&apos;re a jobseeker or an employer, GensanWorks keeps applications, referrals
                and hiring updates in one place, with PESO General Santos City supporting each step.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/signup/jobseeker" className="group relative inline-flex items-center justify-center bg-white text-blue-700 px-8 py-4 rounded-xl font-bold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  <span className="relative z-10">Start as Jobseeker</span>
                </Link>
                <Link href="/signup/employer" className="group inline-flex items-center justify-center border border-white/30 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:border-white/50">
                  Start as Employer
                </Link>
              </div>
            </div>

            <ul className="grid sm:grid-cols-2 gap-4">
              {highlights.map((item, i) => (
                <li
                  key={item.label}
                  className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-colors ${i === 2 ? "sm:col-span-2" : ""}`}
                >
                  <div aria-hidden="true" className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <item.icon className="w-6 h-6 text-blue-100" />
                  </div>
                  <p className="text-sm font-semibold text-blue-100 mb-1">{item.label}</p>
                  <p className="text-3xl font-bold text-white tabular-nums">
                    <Figure value={item.value} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
