"use client";

import React from "react";
import Link from "next/link";
import { Search, FileText, Target, Users, ChevronRight } from "lucide-react";

const services = [
  {
    title: "Job Search Portal",
    description: "Browse thousands of verified job opportunities across various industries with our intelligent matching system.",
    icon: Search,
    href: "/jobs",
    className: "md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 hover:from-blue-500/20",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10"
  },
  {
    title: "Post Job Vacancies",
    description: "Reach qualified candidates quickly with our streamlined posting system.",
    icon: FileText,
    href: "/employer/jobs",
    className: "md:col-span-1 md:row-span-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10"
  },
  {
    title: "Career Development",
    description: "Access training programs, workshops, and resources.",
    icon: Target,
    href: "/help",
    className: "md:col-span-1 md:row-span-1 bg-gradient-to-br from-purple-500/10 to-pink-500/5 hover:from-purple-500/20",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10"
  },
  {
    title: "Job Fairs & Events",
    description: "Participate in career fairs, recruitment drives, and networking events.",
    icon: Users,
    href: "/contact",
    className: "md:col-span-2 md:row-span-1 bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:from-amber-500/20 flex-row items-center",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10"
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="w-full bg-white py-32 relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold tracking-widest uppercase mb-6">
              Our Services
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Comprehensive Employment <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Services</span>
            </h2>
          </div>
          <p className="text-lg text-slate-500 max-w-sm">
            Everything you need to succeed in your career journey or find the perfect candidate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 auto-rows-[250px]">
          {services.map((service, idx) => (
            <Link
              key={service.title}
              href={service.href}
              className={`group relative overflow-hidden rounded-3xl border border-slate-200/50 p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 ${service.className}`}
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${service.iconBg}`}>
                  <service.icon className={`w-7 h-7 ${service.iconColor}`} />
                </div>
                
                <div className="mt-8">
                  <h3 className={`font-bold text-slate-900 mb-3 ${idx === 0 ? 'text-3xl' : 'text-xl'}`}>
                    {service.title}
                  </h3>
                  <p className={`text-slate-600 leading-relaxed ${idx === 0 ? 'text-lg' : 'text-sm'} max-w-md`}>
                    {service.description}
                  </p>
                </div>

                <div className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  <ChevronRight className="w-5 h-5 text-slate-900" />
                </div>
              </div>
              
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}