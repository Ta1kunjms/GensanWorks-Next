"use client";

import React from "react";
import Link from "next/link";
import { Search, FileText, Target, Users, ChevronRight } from "lucide-react";
import { Accent, CARD_HOVER, CONTAINER, Eyebrow, SECTION_Y, SectionLead, SectionTitle } from "./landing-shared";

const services = [
  {
    title: "Job Search Portal",
    description: "Search open job posts from PESO-reviewed employers and get AI-assisted suggestions based on your profile.",
    icon: Search,
    href: "/jobs",
    className: "md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-50 to-indigo-50/60",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    title: "Post Job Vacancies",
    description: "Post vacancies for PESO review and manage your applicants in one place.",
    icon: FileText,
    href: "/employer/jobs",
    className: "bg-gradient-to-br from-emerald-50 to-teal-50/60",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Career Development",
    description: "Ask PESO about training programs, workshops, and resources.",
    icon: Target,
    href: "/help",
    className: "bg-gradient-to-br from-violet-50 to-indigo-50/60",
    iconClass: "bg-violet-100 text-violet-700",
  },
  {
    title: "Job Fairs & Events",
    description: "Contact PESO about career fairs and recruitment drives.",
    icon: Users,
    href: "/contact",
    className: "md:col-span-2 bg-gradient-to-br from-amber-50 to-orange-50/60",
    iconClass: "bg-amber-100 text-amber-700",
  },
];

export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-heading" className={`relative w-full bg-white scroll-mt-24 ${SECTION_Y}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

      <div className={CONTAINER}>
        <div className="mb-12 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Eyebrow>Our Services</Eyebrow>
            <SectionTitle id="services-heading" className="mt-5">
              Comprehensive Employment <Accent>Services</Accent>
            </SectionTitle>
          </div>
          <SectionLead className="max-w-md">
            Everything you need to succeed in your career journey or find the perfect candidate.
          </SectionLead>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:auto-rows-[minmax(14rem,auto)]">
          {services.map((service, idx) => (
            <Link
              key={service.title}
              href={service.href}
              className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 p-6 shadow-sm md:p-8 ${CARD_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${service.className}`}
            >
              <div className="flex items-start justify-between">
                <div aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-xl ${service.iconClass}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-colors group-hover:bg-blue-600">
                  <ChevronRight className="h-5 w-5 text-slate-700 transition-colors group-hover:text-white" />
                </div>
              </div>

              <div className="mt-8">
                <h3 className={`font-semibold text-slate-900 ${idx === 0 ? "text-2xl md:text-3xl" : "text-xl"}`}>
                  {service.title}
                </h3>
                <p className={`mt-2 max-w-md leading-relaxed text-slate-600 ${idx === 0 ? "text-lg" : "text-base"}`}>
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
