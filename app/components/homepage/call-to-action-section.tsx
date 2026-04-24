"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Users,
  Video,
} from "lucide-react";

interface CallToActionSectionProps {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
  email: string;
  setEmail: (email: string) => void;
  handleNewsletterSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function CallToActionSection({
  faqs,
  openFaq,
  setOpenFaq,
  email,
  setEmail,
  handleNewsletterSubmit,
}: CallToActionSectionProps) {
  const highlights = [
    { label: "Job Alerts", value: "Instant", icon: Bell },
    { label: "Talent Pool", value: "30k+", icon: Users },
    { label: "Interview Prep", value: "Guided", icon: Video },
  ];

  return (
    <>
      {/* CTA Section */}
      <section className="w-full bg-slate-50 py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white p-10 md:p-16 lg:p-20 shadow-2xl border border-white/10">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay" />
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60 pointer-events-none" />
            
            <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">
                    Next Steps
                  </span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                  Ready to turn applications into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">offers?</span>
                </h2>
                
                <p className="text-blue-100/80 text-lg leading-relaxed max-w-xl">
                  Whether you're a jobseeker or an employer, GensanWorks keeps
                  hiring conversations moving with instant alerts, guided interviews,
                  and PESO-backed trust.
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
              
              <div className="grid sm:grid-cols-2 gap-4">
                {highlights.map((item, i) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-colors ${i === 2 ? 'sm:col-span-2' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4 border border-white/10">
                      <item.icon className="w-6 h-6 text-blue-200" />
                    </div>
                    <p className="text-sm font-semibold text-blue-200 mb-1">{item.label}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold text-white">{item.value}</p>
                      <p className="text-xs text-white/50 mb-1 font-medium">Included</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full bg-white py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
              Support
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Questions</span>
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Get answers to common questions about using GensanWorks for your job search or hiring needs.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${openFaq === index ? 'border-blue-200 shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <span className={`text-lg font-bold transition-colors ${openFaq === index ? 'text-blue-600' : 'text-slate-900'}`}>
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openFaq === index ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div 
                  className={`px-8 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0 pb-0'}`}
                >
                  <p className="text-slate-600 leading-relaxed pt-2 border-t border-slate-100 text-base">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="w-full bg-[#0a0f1c] py-24 relative overflow-hidden">
        {/* Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-4">
                Stay Connected
              </p>
              <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Never miss an opportunity</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Get the latest job opportunities, local employment news, and career tips delivered straight to your inbox.
              </p>
            </div>

            <form
              onSubmit={handleNewsletterSubmit}
              className="max-w-md mx-auto relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex flex-col sm:flex-row gap-3 bg-slate-900 p-2 rounded-xl border border-white/10">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-transparent px-4 py-3 text-white placeholder-slate-500 border-none focus:ring-0 focus:outline-none"
                  required
                />
                <Button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
                >
                  Subscribe
                </Button>
              </div>
            </form>

            <p className="text-slate-500 text-sm font-medium">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}