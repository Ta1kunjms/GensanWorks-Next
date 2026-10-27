"use client";

import React from "react";
import Link from "next/link";
import { Clock, Smartphone, GraduationCap, HeadphonesIcon, FileText } from "lucide-react";
import { Accent, CARD_GLASS, CONTAINER, Eyebrow, SECTION_Y, SectionLead, SectionTitle } from "./landing-shared";

const experienceHighlights = [
  {
    title: "Responsive Everywhere",
    description: "Desktop, tablet, or mobile—continue applications seamlessly.",
    icon: Smartphone
  },
  {
    title: "Career Coaching",
    description: "PESO counselors help polish resumes and prep interviews.",
    icon: GraduationCap
  },
  {
    title: "Human + AI Support",
    description: "AI-assisted suggestions; PESO staff and employers make the decisions.",
    icon: HeadphonesIcon
  },
  {
    title: "Skills Mapping",
    description: "List certificates and NC II levels so they count toward job suggestions.",
    icon: FileText
  },
];

export function ExperienceSection() {
  return (
    <section aria-labelledby="experience-heading" className={`relative w-full overflow-hidden bg-slate-950 text-white ${SECTION_Y}`}>
      {/* Dynamic Background */}
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px" }}></div>
      </div>

      <div className={CONTAINER}>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          {/* Left Content */}
          <div className="min-w-0">
            <Eyebrow tone="dark" icon={Clock}>How PESO Helps</Eyebrow>
            <SectionTitle id="experience-heading" tone="dark" className="mt-5">
              Human guidance meets <Accent tone="dark">automation</Accent> for everyone.
            </SectionTitle>
            <SectionLead tone="dark" className="mt-4">
              PESO staff help with registration, referrals and follow-up, and the platform works on desktop, tablet and phone, so you can start at the PESO office and continue at home.
            </SectionLead>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-slate-900 transition-shadow duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                Schedule Orientation
              </Link>
              <Link href="/help" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                See Support Programs
              </Link>
            </div>
          </div>

          {/* Right Grid */}
          <ul className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
            {experienceHighlights.map((item) => (
              <li
                key={item.title}
                className={`${CARD_GLASS} flex h-full flex-col p-6 backdrop-blur-xl transition-colors duration-200 hover:border-white/20 hover:bg-white/10 md:p-8`}
              >
                <div aria-hidden="true" className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-blue-500/15">
                  <item.icon className="h-6 w-6 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-300">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
