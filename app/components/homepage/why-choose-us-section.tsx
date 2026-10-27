"use client";

import React from "react";
import { Zap, Shield, Users, CheckCircle, Lock, UserCheck } from "lucide-react";
import { Accent, CARD_DARK, CONTAINER, Eyebrow, SECTION_Y, SectionLead, SectionTitle } from "./landing-shared";

const trustSignals = [
  { title: "Run with PESO", description: "Built with the Public Employment Service Office of General Santos City.", icon: Shield, iconClass: "bg-blue-50 text-blue-700" },
  { title: "Consent First", description: "Jobseeker data is used only after consent, under a published privacy notice.", icon: Lock, iconClass: "bg-emerald-50 text-emerald-700" },
  { title: "Reviewed Employers", description: "PESO staff review employer accounts before they can post jobs.", icon: UserCheck, iconClass: "bg-indigo-50 text-indigo-700" },
  { title: "AI-Assisted Matching", description: "Job suggestions are assistance only; PESO staff and employers decide.", icon: Zap, iconClass: "bg-amber-50 text-amber-700" },
];

const networkFeatures = [
  "Direct line to PESO General Santos City",
  "AI-assisted job suggestions with explanations",
  "Referral tracking from slip to outcome",
  "Consent-based handling of your documents",
];

export function WhyChooseUsSection() {
  return (
    <section aria-labelledby="why-heading" className={`relative w-full overflow-hidden bg-white ${SECTION_Y}`}>
      {/* Background Graphic */}
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-slate-50 rounded-full blur-[100px] pointer-events-none" />

      <div className={CONTAINER}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column */}
          <div className="min-w-0">
            <Eyebrow icon={Shield}>Trusted Platform</Eyebrow>
            <SectionTitle id="why-heading" className="mt-5">
              Why <Accent>GensanWorks?</Accent>
            </SectionTitle>
            <SectionLead className="mt-4 max-w-lg">
              A PESO-led platform for General Santos City that connects jobseekers with PESO-reviewed employers, with people, not algorithms, making the final hiring decisions.
            </SectionLead>

            <ul className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {trustSignals.map((signal) => (
                <li key={signal.title} className="flex flex-col gap-3">
                  <div aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-xl ${signal.iconClass}`}>
                    <signal.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{signal.title}</h3>
                    <p className="mt-1 text-base leading-relaxed text-slate-600">{signal.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column - Visual Element */}
          <div className="relative min-w-0">
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-3xl rounded-full" />
            <div className={`${CARD_DARK} relative overflow-hidden p-6 shadow-xl sm:p-8 md:p-10`}>
              <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-blue-500/30 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <div className="mb-8 flex items-center gap-4 border-b border-white/10 pb-8">
                  <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/20">
                    <Users className="h-7 w-7 text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-white">Reviewed Network</h3>
                    <p className="text-base text-slate-300">Employer accounts approved by PESO staff</p>
                  </div>
                </div>

                <ul className="space-y-5">
                  {networkFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-4">
                      <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/20">
                        <CheckCircle className="h-4 w-4 text-emerald-300" />
                      </div>
                      <span className="text-base font-medium text-slate-200">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
