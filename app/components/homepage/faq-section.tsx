"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { Accent, SECTION_Y, SectionHeader } from "./landing-shared";

interface FaqSectionProps {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
}

// FAQ accordion in the pre-cleanup card style. Each trigger exposes
// aria-expanded/aria-controls; closed panels use the hidden attribute.
export function FaqSection({ faqs, openFaq, setOpenFaq }: FaqSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className={`w-full bg-white ${SECTION_Y}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          id="faq-heading"
          eyebrow="Support"
          icon={HelpCircle}
          title={<>Frequently Asked <Accent>Questions</Accent></>}
          lead="Common questions about using GensanWorks for your job search or hiring."
        />

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;
            return (
              <div
                key={`${index}-${faq.question}`}
                className={`overflow-hidden rounded-2xl border bg-white transition-[box-shadow,border-color] duration-200 ${isOpen ? "border-blue-200 shadow-md" : "border-slate-200 shadow-sm hover:border-slate-300"}`}
              >
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6"
                  >
                    <span className={`text-base font-semibold transition-colors sm:text-lg ${isOpen ? "text-blue-700" : "text-slate-900"}`}>
                      {faq.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      <svg
                        className={`h-5 w-5 transform transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!isOpen} className="px-5 pb-5 sm:px-6">
                  <p className="border-t border-slate-100 pt-4 text-base leading-relaxed text-slate-600">
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
