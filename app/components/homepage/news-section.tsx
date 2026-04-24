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
    <section className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14">
        <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
          Stay Informed
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          Latest News & Announcements
        </h2>
        <p className="text-lg text-slate-600">
          The latest employment opportunities and events in General Santos City
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {newsItems.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300"
          >
            <div className={`${item.color} p-6 text-white`}>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider">
                {item.type}
              </div>
              <h3 className="text-xl font-bold">{item.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
                <MapPin className="w-4 h-4" />
                <span>{item.location}</span>
              </div>
              <Link
                href={item.link}
                className={`${item.color.replace('bg-', 'text-')} font-semibold hover:underline text-sm inline-flex items-center gap-1 group hover:gap-2 transition-all`}
              >
                {item.type === "UPCOMING EVENT" ? "Register Now" : 
                 item.type === "NEW FEATURE" ? "Learn More" : "Register Free"}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}