"use client";

import React from "react";
import { Zap, Shield, Users, CheckCircle, Lock, UserCheck } from "lucide-react";

export function WhyChooseUsSection() {
  const trustSignals = [
    { title: "Run with PESO", description: "Built with the Public Employment Service Office of General Santos City.", icon: Shield, gradient: "from-blue-500 to-indigo-500" },
    { title: "Consent First", description: "Jobseeker data is used only after consent, under a published privacy notice.", icon: Lock, gradient: "from-emerald-500 to-teal-500" },
    { title: "Reviewed Employers", description: "PESO staff review employer accounts before they can post jobs.", icon: UserCheck, gradient: "from-purple-500 to-pink-500" },
    { title: "AI-Assisted Matching", description: "Job suggestions are assistance only; PESO staff and employers decide.", icon: Zap, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <section aria-labelledby="why-heading" className="w-full bg-white py-32 relative overflow-hidden">
      {/* Background Graphic */}
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-slate-50 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
              <Shield className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Trusted Platform
            </div>
            <h2 id="why-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">GensanWorks?</span>
            </h2>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
              A PESO-led platform for General Santos City that connects jobseekers with PESO-reviewed employers, with people, not algorithms, making the final hiring decisions.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {trustSignals.map((signal, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <div aria-hidden="true" className={`w-12 h-12 rounded-xl bg-gradient-to-br ${signal.gradient} p-0.5 shadow-lg`}>
                    <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                      <signal.icon className={`w-5 h-5 bg-clip-text text-transparent bg-gradient-to-br ${signal.gradient}`} style={{ color: "var(--tw-gradient-from)" }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{signal.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{signal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual Element */}
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-3xl rounded-full" />
            <div className="relative bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-800 overflow-hidden">
              <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-blue-500/30 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
                  <div aria-hidden="true" className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 backdrop-blur-md">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Reviewed Network</h3>
                    <p className="text-slate-300 text-sm">Employer accounts approved by PESO staff</p>
                  </div>
                </div>
                
                <ul className="space-y-6">
                  {[
                    "Direct line to PESO General Santos City",
                    "AI-assisted job suggestions with explanations",
                    "Referral tracking from slip to outcome",
                    "Consent-based handling of your documents"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-4">
                      <div aria-hidden="true" className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-slate-200 font-medium">{feature}</span>
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