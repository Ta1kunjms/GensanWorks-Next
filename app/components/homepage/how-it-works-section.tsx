"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, UserCheck, Search, Briefcase } from "lucide-react";

const howItWorksSteps = [
  {
    id: 1,
    title: "Create Your Profile",
    description: "Sign up, upload credentials, and highlight your skills in minutes.",
    bullets: ["Upload resume & certificates", "Highlight your skills", "Set job preferences"],
  },
  {
    id: 2,
    title: "Search & Apply",
    description: "Curated recommendations, smart filters, and instant notifications.",
    bullets: ["Personalized job feed", "Realtime status updates", "Direct employer chat"],
  },
  {
    id: 3,
    title: "Get Hired",
    description: "Track referrals, attend interviews, and sign offers faster.",
    bullets: ["Referral tracking", "Interview support", "Offer guidance"],
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
            Simple Process
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            How GensanWorks Works
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Get started in three easy steps and unlock your career potential.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {howItWorksSteps.map((step) => (
            <div key={step.id} className="relative group">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 h-full hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                  {step.id === 1 ? (
                    <UserCheck className="w-7 h-7 text-blue-600" />
                  ) : step.id === 2 ? (
                    <Search className="w-7 h-7 text-green-600" />
                  ) : (
                    <Briefcase className="w-7 h-7 text-purple-600" />
                  )}
                </div>
                <div className="absolute top-6 right-6 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {step.id}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                  {step.description}
                </p>
                <ul className="space-y-2.5 text-sm">
                  {step.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}