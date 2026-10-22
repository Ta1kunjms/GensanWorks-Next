"use client";

import React from "react";
import Link from "next/link";
import { UserCheck, Search, ClipboardList, FileText, Target, Users, ChevronRight } from "lucide-react";

const howItWorksSteps = [
  {
    id: 1,
    title: "Create your profile",
    description: "Sign up, upload your resume and list your skills, education and job preferences.",
    icon: UserCheck,
  },
  {
    id: 2,
    title: "Search and apply",
    description:
      "Browse open jobs and apply online. Job suggestions are AI-assisted; PESO staff and employers make the decisions.",
    icon: Search,
  },
  {
    id: 3,
    title: "Follow your application",
    description: "Track application and referral status in your account and get notified when it changes.",
    icon: ClipboardList,
  },
];

// Services content (formerly a separate section) folded in here; keeps id="services"
// so the header's /#services link still lands on it.
const services = [
  {
    title: "Job search",
    description: "Find open positions posted by employers in and around General Santos City.",
    icon: Search,
    href: "/jobs",
  },
  {
    title: "Post job vacancies",
    description: "Employers can register, get approved by PESO and post vacancies.",
    icon: FileText,
    href: "/employer/jobs",
  },
  {
    title: "Career development",
    description: "Guides and help resources for your job search.",
    icon: Target,
    href: "/help",
  },
  {
    title: "Job fairs and events",
    description: "Ask the PESO office about upcoming job fairs and recruitment activities.",
    icon: Users,
    href: "/contact",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="w-full scroll-mt-24 bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 id="how-it-works-heading" className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-slate-600">Three steps from sign-up to application.</p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {howItWorksSteps.map((step) => (
            <li key={step.id} className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary" aria-hidden="true">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-600">Step {step.id}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </li>
          ))}
        </ol>

        <div id="services" className="mt-12 scroll-mt-24">
          <h3 className="text-lg font-semibold text-slate-900">PESO services</h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <li key={service.title}>
                <Link
                  href={service.href}
                  className="flex h-full items-start gap-4 rounded-lg border border-slate-200 p-5 transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary" aria-hidden="true">
                    <service.icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-slate-900">{service.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{service.description}</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
