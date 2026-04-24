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

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  quote: string;
  hiredDate: string;
  isVerified: boolean;
}

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
  testimonials?: Testimonial[];
  testimonialsLoading?: boolean;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Maria Elena Torres",
    role: "Customer Support Specialist",
    company: "Pioneer Contact Center",
    quote:
      "GensanWorks helped me find my dream job within just 2 weeks. The resume review and interview prep were incredibly helpful!",
    hiredDate: "2024-03-15",
    isVerified: true,
  },
  {
    id: "2",
    name: "John Carlo Mendoza",
    role: "Web Developer",
    company: "Mindanao Tech Hub",
    quote:
      "The AI matching system connected me with exactly what I was looking for. PESO GenSan made the process so easy.",
    hiredDate: "2024-02-28",
    isVerified: true,
  },
  {
    id: "3",
    name: "Sarah Jane Diaz",
    role: "Medical Encoder",
    company: "SOCCSKSARGEN Medical",
    quote:
      "I was skeptical at first, but the verified job posts gave me confidence. Got hired the same month I registered!",
    hiredDate: "2024-01-20",
    isVerified: true,
  },
];

export function CallToActionSection({
  faqs,
  openFaq,
  setOpenFaq,
  email,
  setEmail,
  handleNewsletterSubmit,
  testimonials = [],
  testimonialsLoading = false,
}: CallToActionSectionProps) {
  const highlights = [
    { label: "Job Alerts", value: "Instant", icon: Bell },
    { label: "Talent Pool", value: "30k+", icon: Users },
    { label: "Interview Prep", value: "Guided", icon: Video },
  ];

  const displayTestimonials: Testimonial[] =
    testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <>
      {/* CTA Section */}
      <section className="w-full bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white p-10 lg:p-14 shadow-2xl">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-white/5 blur-3xl" />
            <div className="relative grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div className="space-y-5">
                <p className="text-xs font-semibold tracking-[0.45em] uppercase text-white/70">
                  Next Steps
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Ready to turn applications into offers?
                </h2>
                <p className="text-white/80 text-lg leading-relaxed">
                  Whether you're a jobseeker or an employer, GensanWorks keeps
                  hiring conversations moving with instant alerts, guided interviews,
                  and PESO-backed trust.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/signup/jobseeker"
                    className="flex-1 sm:flex-initial"
                  >
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 px-8 py-5 text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      Start as Jobseeker
                    </Button>
                  </Link>
                  <Link
                    href="/signup/employer"
                    className="flex-1 sm:flex-initial"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-white/60 text-white hover:bg-white/10 px-8 py-5 text-sm font-semibold"
                    >
                      Start as Employer
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {highlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/25 bg-white/10 backdrop-blur p-4 hover:bg-white/15 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-white/70">Included for free</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
              Need Help?
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Get answers to common questions about using GensanWorks for your job search or hiring needs.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-blue-300 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-slate-500 transform transition-transform ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="w-full bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-200 mb-3">
                Stay Connected
              </p>
              <h2 className="text-2xl font-bold text-white mb-2">Stay Updated</h2>
              <p className="text-blue-100 text-lg">
                Get the latest job opportunities and career tips delivered to your inbox.
              </p>
            </div>

            <form
              onSubmit={handleNewsletterSubmit}
              className="max-w-md mx-auto space-y-4"
            >
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                  required
                />
                <Button
                  type="submit"
                  className="px-6 py-3 bg-white text-blue-600 hover:bg-slate-100 font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Subscribe
                </Button>
              </div>
            </form>

            <p className="text-blue-200 text-xs mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}