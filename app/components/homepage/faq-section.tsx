"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FaqSectionProps {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
}

// FAQ accordion (moved out of call-to-action-section, which is no longer rendered).
// Each trigger exposes aria-expanded/aria-controls; closed panels use the hidden attribute.
export function FaqSection({ faqs, openFaq, setOpenFaq }: FaqSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="w-full bg-slate-50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Common questions about using GensanWorks for your job search or hiring.
          </p>
        </div>

        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;
            return (
              <div key={`${index}-${faq.question}`}>
                <h3>
                  <Button
                    id={triggerId}
                    type="button"
                    variant="ghost"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="h-auto w-full justify-between gap-4 whitespace-normal rounded-none px-5 py-4 text-left text-base font-semibold text-slate-900"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={cn("h-5 w-5 shrink-0 text-slate-600 transition-transform", isOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </Button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!isOpen} className="px-5 pb-5">
                  <p className="text-base leading-relaxed text-slate-600">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
