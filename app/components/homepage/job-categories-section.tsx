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
import { Accent, CARD, CARD_HOVER, CONTAINER, SECTION_Y, SectionHeader } from "./landing-shared";

interface JobCategory {
  name: string;
  category: string;
  jobs: string;
  icon?: React.ElementType;
  gradient?: string;
}

interface JobCategoriesSectionProps {
  categories?: JobCategory[];
  loading?: boolean;
}

// One accent per card, cycled; icon tiles use the solid tint so the icon keeps its contrast.
const ACCENTS = [
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-indigo-50 text-indigo-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
  "bg-violet-50 text-violet-700",
  "bg-slate-100 text-slate-700",
];

export function JobCategoriesSection({ categories, loading = false }: JobCategoriesSectionProps) {
  // Real categories only (/api/landing/categories); no placeholder counts.
  const displayCategories = categories ?? [];

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

  return (
    <section aria-labelledby="categories-heading" className={`relative w-full overflow-hidden bg-slate-50 ${SECTION_Y}`}>
      {/* Decorative Blob */}
      <div aria-hidden="true" className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />

      <div className={CONTAINER}>
        <SectionHeader
          id="categories-heading"
          eyebrow="Find Your Path"
          icon={Search}
          title={<>Browse Jobs by <Accent>Category</Accent></>}
          lead="Explore open job posts from PESO-reviewed employers, grouped by category."
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} aria-hidden="true" className={`${CARD} h-44 motion-safe:animate-pulse`} />
            ))
          ) : displayCategories.length > 0 ? (
            displayCategories.map((category, index) => {
              const Icon = category.icon || getIcon(category.name);
              return (
                <Link
                  key={category.name}
                  href={category.category === "all" ? "/jobs" : `/jobs?category=${category.category}`}
                  className={`group flex h-full min-h-44 flex-col justify-between p-6 ${CARD} ${CARD_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                >
                  <div className="flex items-start justify-between">
                    <div aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-xl ${ACCENTS[index % ACCENTS.length]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-slate-500 transition-colors group-hover:text-blue-700" />
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600 tabular-nums">
                      {category.jobs}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center">
              <p className="text-lg font-medium text-slate-600">No job categories available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
