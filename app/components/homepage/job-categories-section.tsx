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

interface JobCategory {
  name: string;
  category: string;
  jobs: string;
  icon?: any;
  gradient?: string;
}

interface JobCategoriesSectionProps {
  categories?: JobCategory[];
  loading?: boolean;
}

const defaultJobCategories = [
  {
    name: "Technology & IT",
    category: "technology",
    jobs: "2,341 open roles",
    icon: Code,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    name: "Healthcare",
    category: "healthcare",
    jobs: "1,876 open roles",
    icon: Stethoscope,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Education",
    category: "education",
    jobs: "1,432 open roles",
    icon: GraduationCap,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Engineering",
    category: "engineering",
    jobs: "1,098 open roles",
    icon: Wrench,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    name: "Customer Service",
    category: "customer-service",
    jobs: "987 open roles",
    icon: HeadphonesIcon,
    gradient: "from-rose-500 to-red-500",
  },
  {
    name: "Sales & Marketing",
    category: "sales",
    jobs: "1,654 open roles",
    icon: TrendingUp,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    name: "Admin & Office",
    category: "admin",
    jobs: "1,234 open roles",
    icon: FileText,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    name: "All Categories",
    category: "all",
    jobs: "10,000+ opportunities",
    icon: Search,
    gradient: "from-slate-600 to-slate-800",
  },
];

export function JobCategoriesSection({ categories, loading = false }: JobCategoriesSectionProps) {
  const displayCategories = categories && categories.length > 0 ? categories : (loading ? [] : defaultJobCategories);

  const getIcon = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('tech') || lower.includes('it')) return Code;
    if (lower.includes('health')) return Stethoscope;
    if (lower.includes('edu')) return GraduationCap;
    if (lower.includes('eng')) return Wrench;
    if (lower.includes('customer') || lower.includes('support')) return HeadphonesIcon;
    if (lower.includes('sale') || lower.includes('market')) return TrendingUp;
    if (lower.includes('admin') || lower.includes('office')) return FileText;
    return Search;
  };

  const getGradient = (index: number) => {
    const gradients = [
      "from-blue-500 to-indigo-500",
      "from-emerald-500 to-teal-500",
      "from-purple-500 to-pink-500",
      "from-amber-500 to-orange-500",
      "from-rose-500 to-red-500",
      "from-cyan-500 to-blue-500",
      "from-indigo-500 to-purple-500",
      "from-slate-600 to-slate-800",
    ];
    return gradients[index % gradients.length];
  };
  return (
    <section className="w-full bg-slate-50 py-32 relative overflow-hidden">
      {/* Decorative Blob */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm font-semibold tracking-wide mb-6">
            <Search className="w-4 h-4 text-blue-500" />
            Find Your Path
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Browse Jobs by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Category</span>
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl">
            Explore thousands of highly-rated opportunities across diverse industries tailored to your skills.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse h-48" />
            ))
          ) : displayCategories.length > 0 ? (
            displayCategories.map((category, index) => {
              const Icon = category.icon || getIcon(category.name);
              const gradient = category.gradient || getGradient(index);
              return (
                <Link
                  key={category.name}
                  href={category.category === "all" ? "/jobs" : `/jobs?category=${category.category}`}
                  className="group relative bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} p-[2px] shadow-lg shadow-blue-500/10 transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110`}>
                      <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                        <Icon className={`w-6 h-6 bg-clip-text text-transparent bg-gradient-to-br ${gradient}`} />
                      </div>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <ArrowUpRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>

                  <div className="relative z-10 mt-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {category.jobs}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-400 text-lg font-medium">No job categories available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}