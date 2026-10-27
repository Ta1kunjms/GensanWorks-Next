"use client";

import React from "react";
import { CheckCircle2, UserCheck, Search, Briefcase } from "lucide-react";

const howItWorksSteps = [
  {
    id: 1,
    title: "Create Your Profile",
    description: "Sign up, give your consent, and list your education, experience and skills.",
    bullets: ["Upload your resume", "List your skills and trainings", "Set job preferences"],
  },
  {
    id: 2,
    title: "Search & Apply",
    description: "Search open posts from PESO-reviewed employers and apply online.",
    bullets: ["Search and filter job posts", "Save jobs for later", "Application status updates"],
  },
  {
    id: 3,
    title: "Get Hired",
    description: "PESO may refer you to employers; employers review and decide.",
    bullets: ["Referral tracking", "Interview updates", "PESO staff support"],
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="w-full py-24 relative overflow-hidden bg-slate-900 scroll-mt-24">
      {/* Background Decorative Elements */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold tracking-widest uppercase mb-6">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-500 motion-safe:animate-pulse"></span>
            Simple Process
          </div>
          <h2 id="how-it-works-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            How GensanWorks <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Works</span>
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light">
            Three steps from registration to referral, with AI-assisted job suggestions and PESO staff along the way.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
          {/* Connecting Line for Desktop */}
          <div aria-hidden="true" className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent -translate-y-1/2 z-0" />

          {howItWorksSteps.map((step, index) => (
            <div key={step.id} className={`relative z-10 group ${index === 1 ? 'lg:-translate-y-6' : 'lg:translate-y-6'}`}>
              <div className="h-full rounded-3xl p-px bg-gradient-to-b from-white/10 to-transparent transition-all duration-500 group-hover:from-blue-500/30">
                <div className="h-full bg-slate-900/80 backdrop-blur-xl rounded-[23px] p-8 md:p-10 border border-white/5 transition-all duration-500 group-hover:bg-slate-800/80 group-hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]">
                  
                  {/* Icon & Number Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div aria-hidden="true" className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      {step.id === 1 ? (
                        <UserCheck className="w-8 h-8 text-blue-400" />
                      ) : step.id === 2 ? (
                        <Search className="w-8 h-8 text-indigo-400" />
                      ) : (
                        <Briefcase className="w-8 h-8 text-purple-400" />
                      )}
                    </div>
                    <span aria-hidden="true" className="text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors duration-500">
                      0{step.id}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-slate-300 mb-8 leading-relaxed font-light">
                    {step.description}
                  </p>
                  
                  <ul className="space-y-4">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-3">
                        <div aria-hidden="true" className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-slate-300 text-sm">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}