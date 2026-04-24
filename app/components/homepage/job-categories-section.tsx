"use client";

import React from "react";
import Link from "next/link";
import { 
  Code, 
  Stethoscope, 
  GraduationCap, 
  Wrench, 
  HeadphonesIcon, 
  TrendingUp, 
  FileText, 
  Search,
  ArrowUpRight
} from "lucide-react";

const jobCategories = [
  {
    name: "Technology & IT",
    category: "technology",
    jobs: "2,341 jobs available",
    icon: Code,
    color: "bg-blue-50 hover:bg-blue-100",
    iconColor: "text-blue-600",
    border: "hover:border-blue-200",
  },
  {
    name: "Healthcare",
    category: "healthcare",
    jobs: "1,876 jobs available",
    icon: Stethoscope,
    color: "bg-green-50 hover:bg-green-100",
    iconColor: "text-green-600",
    border: "hover:border-green-200",
  },
  {
    name: "Education",
    category: "education",
    jobs: "1,432 jobs available",
    icon: GraduationCap,
    color: "bg-purple-50 hover:bg-purple-100",
    iconColor: "text-purple-600",
    border: "hover:border-purple-200",
  },
  {
    name: "Engineering",
    category: "engineering",
    jobs: "1,098 jobs available",
    icon: Wrench,
    color: "bg-amber-50 hover:bg-amber-100",
    iconColor: "text-amber-600",
    border: "hover:border-amber-200",
  },
  {
    name: "Customer Service",
    category: "customer-service",
    jobs: "987 jobs available",
    icon: HeadphonesIcon,
    color: "bg-pink-50 hover:bg-pink-100",
    iconColor: "text-pink-600",
    border: "hover:border-pink-200",
  },
  {
    name: "Sales & Marketing",
    category: "sales",
    jobs: "1,654 jobs available",
    icon: TrendingUp,
    color: "bg-cyan-50 hover:bg-cyan-100",
    iconColor: "text-cyan-600",
    border: "hover:border-cyan-200",
  },
  {
    name: "Admin & Office",
    category: "admin",
    jobs: "1,234 jobs available",
    icon: FileText,
    color: "bg-indigo-50 hover:bg-indigo-100",
    iconColor: "text-indigo-600",
    border: "hover:border-indigo-200",
  },
  {
    name: "All Categories",
    category: "all",
    jobs: "10,000+ jobs available",
    icon: Search,
    color: "bg-slate-100 hover:bg-slate-200",
    iconColor: "text-slate-600",
    border: "hover:border-slate-400",
  },
];

export function JobCategoriesSection() {
  return (
    <section className="w-full bg-slate-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
            Find Your Path
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Browse Jobs by Category
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Explore thousands of opportunities across diverse industries.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {jobCategories.map((category) => (
            <Link
              key={category.name}
              href={category.category === "all" ? "/jobs" : `/jobs?category=${category.category}`}
              className={`group bg-white p-5 rounded-xl border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 ${category.border}`}
            >
              <div className={`w-11 h-11 ${category.color} rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:scale-110`}>
                <category.icon className={`w-5 h-5 ${category.iconColor}`} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">
                {category.name}
              </h3>
              <p className="text-xs text-slate-500 mb-2">
                {category.jobs}
              </p>
              <span className={`text-xs ${category.iconColor === 'text-slate-600' ? 'text-slate-700' : category.iconColor} font-medium inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform`}>
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}