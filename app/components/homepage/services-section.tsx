"use client";

import React from "react";
import Link from "next/link";
import { Search, FileText, Target, Users, ChevronRight } from "lucide-react";

const services = [
  {
    title: "Job Search Portal",
    description: "Browse thousands of verified job opportunities across various industries.",
    icon: Search,
    href: "/jobs",
    color: "bg-blue-100 hover:bg-blue-600",
    textColor: "text-blue-600 group-hover:text-white",
  },
  {
    title: "Post Job Vacancies",
    description: "Reach qualified candidates quickly with our streamlined posting system.",
    icon: FileText,
    href: "/employer/jobs",
    color: "bg-green-100 hover:bg-green-600",
    textColor: "text-green-600 group-hover:text-white",
  },
  {
    title: "Career Development",
    description: "Access training programs, workshops, and professional development resources.",
    icon: Target,
    href: "/help",
    color: "bg-purple-100 hover:bg-purple-600",
    textColor: "text-purple-600 group-hover:text-white",
  },
  {
    title: "Job Fairs & Events",
    description: "Participate in career fairs, recruitment drives, and networking events.",
    icon: Users,
    href: "/contact",
    color: "bg-amber-100 hover:bg-amber-600",
    textColor: "text-amber-600 group-hover:text-white",
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="w-full bg-slate-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
            Our Services
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Comprehensive Employment Services
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Everything you need to succeed in your career journey or find the perfect candidate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className={`group bg-white rounded-xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 cursor-pointer`}
            >
              <div className={`w-12 h-12 ${service.color} rounded-lg flex items-center justify-center mb-5 transition-colors group-hover:scale-110`}>
                <service.icon className={`w-6 h-6 ${service.textColor} transition-colors`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                {service.description}
              </p>
              <span className={`text-sm font-semibold inline-flex items-center gap-1 ${service.textColor.replace('group-hover:text-white', 'group-hover:gap-2')} group-hover:gap-2 transition-all`}>
                {service.title === "Job Search Portal" ? "Explore Jobs" : 
                 service.title === "Post Job Vacancies" ? "Post a Job" :
                 service.title === "Career Development" ? "Learn More" : "View Events"}
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}