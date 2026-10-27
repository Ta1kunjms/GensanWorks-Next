"use client";

import React, { useState } from "react";

interface FaqSectionProps {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

// FAQ accordion in the pre-cleanup card style. Each trigger exposes
// aria-expanded/aria-controls; closed panels use the hidden attribute.
// Open state lives here so the landing page itself can stay a Server Component.
export function FaqSection({ faqs }: FaqSectionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="w-full bg-white py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            Support
          </div>
          <h2 id="faq-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Questions</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Common questions about using GensanWorks for your job search or hiring.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;
            return (
              <div
                key={`${index}-${faq.question}`}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? "border-blue-200 shadow-md" : "border-slate-200 hover:border-blue-300 hover:shadow-sm"}`}
              >
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-8 py-6 text-left flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                  >
                    <span className={`text-lg font-bold transition-colors ${isOpen ? "text-blue-700" : "text-slate-900"}`}>
                      {faq.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${isOpen ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      <svg
                        className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!isOpen} className="px-8 pb-6">
                  <p className="text-slate-600 leading-relaxed pt-2 border-t border-slate-100 text-base">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
