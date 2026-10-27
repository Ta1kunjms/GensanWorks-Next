"use client";

import React from "react";
import { CheckCircle2, UserCheck, Search, Briefcase } from "lucide-react";
import { Accent, CONTAINER, SECTION_Y, SectionHeader } from "./landing-shared";

const howItWorksSteps = [
  {
    id: 1,
    icon: UserCheck,
    title: "Create Your Profile",
    description: "Sign up, give your consent, and list your education, experience and skills.",
    bullets: ["Upload your resume", "List your skills and trainings", "Set job preferences"],
  },
  {
    id: 2,
    icon: Search,
    title: "Search & Apply",
    description: "Search open posts from PESO-reviewed employers and apply online.",
    bullets: ["Search and filter job posts", "Save jobs for later", "Application status updates"],
  },
  {
    id: 3,
    icon: Briefcase,
    title: "Get Hired",
    description: "PESO may refer you to employers; employers review and decide.",
    bullets: ["Referral tracking", "Interview updates", "PESO staff support"],
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className={`relative w-full overflow-hidden bg-slate-950 scroll-mt-24 ${SECTION_Y}`}>
      {/* Background Decorative Elements */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className={CONTAINER}>
        <SectionHeader
          id="how-it-works-heading"
          tone="dark"
          eyebrow="Simple Process"
          title={<>How GensanWorks <Accent tone="dark">Works</Accent></>}
          lead="Three steps from registration to referral, with AI-assisted job suggestions and PESO staff along the way."
        />

        <div className="relative">
          {/* Connecting Line for Desktop */}
          <div aria-hidden="true" className="absolute left-0 top-1/2 hidden h-px w-full bg-gradient-to-r from-transparent via-blue-400/30 to-transparent lg:block" />
          <ol className="relative grid gap-6 lg:grid-cols-3">
          {howItWorksSteps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id} className={`relative flex h-full flex-col p-6 md:p-8 rounded-2xl border border-white/10 bg-slate-900/80 transition-colors duration-200 hover:border-white/20`}>
                {/* Icon & Number Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
                    <Icon className="h-7 w-7 text-blue-300" />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-300 tabular-nums">
                    Step {step.id}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-300">{step.description}</p>

                <ul className="mt-6 space-y-3 border-t border-white/10 pt-6">
                  {step.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-3">
                      <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-400" />
                      <span className="text-base text-slate-200">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </section>
  );
}
