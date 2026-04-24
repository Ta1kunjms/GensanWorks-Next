"use client";

import React from "react";
import Link from "next/link";
import { Clock, Smartphone, GraduationCap, HeadphonesIcon, FileText, ChevronRight } from "lucide-react";

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
    description: "Automations handle busywork while people focus on you.",
    icon: HeadphonesIcon 
  },
  { 
    title: "Skills Mapping", 
    description: "Match certificates and NCII levels with in-demand roles instantly.",
    icon: FileText 
  },
];

interface ExperienceSectionProps {
  yearsOfService?: number;
  loading?: boolean;
}

export function ExperienceSection({ yearsOfService = 25, loading = false }: ExperienceSectionProps) {
  return (
    <section className="relative w-full bg-slate-900 text-white py-20 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-24 right-0 w-64 h-64 bg-blue-500 blur-[120px]" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-indigo-500 blur-[140px]" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-200">
              Experience
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Human guidance meets automation for every jobseeker and employer.
            </h2>
            <p className="text-base text-slate-200">
              Orientation sessions, coaching, and mobile responsiveness make the platform feel bespoke. Everything is designed so you can start applications at City Hall, continue on your phone, and finish at home.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/contact">
                <button className="bg-white text-slate-900 px-6 py-5 rounded-lg font-semibold hover:bg-slate-100 text-sm">
                  Schedule Orientation
                </button>
              </Link>
              <Link href="/help">
                <button className="border-2 border-white/40 text-white px-6 py-5 rounded-lg font-semibold hover:bg-white/10 text-sm">
                  See Support Programs
                </button>
              </Link>
            </div>
            <div className="inline-flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 px-5 py-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Serving General Santos for {loading ? '25+' : `${yearsOfService}+`} years
                </p>
                <p className="text-xs text-slate-200">Generational employment support</p>
              </div>
            </div>
          </div>
          
          {/* Right Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {experienceHighlights.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white/5 border border-white/15 p-5 hover:bg-white/10 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-lg mb-1">{item.title}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}