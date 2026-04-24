"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Clock, ChevronRight } from "lucide-react";

const newsItems = [
  {
    type: "UPCOMING EVENT",
    title: "City-Wide Job Fair 2025",
    description: "Join our biggest job fair of the year on December 10, 2025 at the City Hall Grounds. Over 100 companies actively hiring!",
    location: "City Hall, General Santos",
    date: "December 10, 2025",
    color: "bg-blue-600",
    link: "/contact",
  },
  {
    type: "NEW FEATURE",
    title: "Enhanced Employer Portal",
    description: "We've launched new tools for employers: advanced filtering, bulk messaging, and detailed analytics dashboard.",
    location: "Available Now",
    date: "Live",
    color: "bg-green-600",
    link: "/employer/signup",
  },
  {
    type: "FREE TRAINING",
    title: "Resume Writing Workshop",
    description: "Free online seminar for jobseekers: Learn how to create a compelling resume that gets noticed by employers.",
    location: "Every Saturday, 2PM",
    date: "Ongoing",
    color: "bg-purple-600",
    link: "/help",
  },
];

export function NewsSection() {
  return (
    <section className="w-full bg-slate-50 py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 border-b border-slate-200 pb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
              Stay Informed
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Latest News & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Announcements</span>
            </h2>
          </div>
          <p className="text-lg text-slate-500 max-w-sm">
            The latest employment opportunities, feature updates, and events in General Santos City.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {newsItems.map((item, index) => {
            const gradientMap: Record<string, string> = {
              'bg-blue-600': 'from-blue-500 to-indigo-600',
              'bg-green-600': 'from-emerald-500 to-teal-600',
              'bg-purple-600': 'from-purple-500 to-pink-600',
            };
            const gradient = gradientMap[item.color] || 'from-slate-500 to-slate-700';

            return (
              <Link
                href={item.link}
                key={index}
                className="group flex flex-col bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden"
              >
                <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />
                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 uppercase tracking-widest`}>
                      {item.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {item.date}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-500 leading-relaxed flex-grow mb-8">
                    {item.description}
                  </p>
                  
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[150px]">{item.location}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors`}>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  );
}