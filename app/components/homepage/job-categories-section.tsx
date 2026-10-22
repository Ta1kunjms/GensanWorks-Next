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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingRegion } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

interface JobCategory {
  name: string;
  category: string;
  /** Count text from /api/landing/categories, e.g. 12 open roles. */
  jobs: string;
}

interface JobCategoriesSectionProps {
  categories?: JobCategory[];
  loading?: boolean;
}

const getIcon = (catName: string) => {
  const lower = catName.toLowerCase();
  if (lower.includes("tech") || lower.includes("it")) return Code;
  if (lower.includes("health")) return Stethoscope;
  if (lower.includes("edu")) return GraduationCap;
  if (lower.includes("eng")) return Wrench;
  if (lower.includes("customer") || lower.includes("support")) return HeadphonesIcon;
  if (lower.includes("sale") || lower.includes("market")) return TrendingUp;
  if (lower.includes("admin") || lower.includes("office")) return FileText;
  return Search;
};

// Categories and counts come only from active job posts (/api/landing/categories).
// No placeholder categories or invented counts: an empty result shows an empty state.
export function JobCategoriesSection({ categories, loading = false }: JobCategoriesSectionProps) {
  const displayCategories = categories ?? [];

  return (
    <section aria-labelledby="categories-heading" className="w-full bg-slate-50 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 id="categories-heading" className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Browse jobs by category
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Open job posts grouped by category. Counts update as employers post and close vacancies.
          </p>
        </div>

        {loading ? (
          <LoadingRegion className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="mt-4 h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-20" />
              </div>
            ))}
          </LoadingRegion>
        ) : displayCategories.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayCategories.map((category) => {
              const Icon = getIcon(category.name);
              return (
                <li key={category.name}>
                  <Link
                    href={`/jobs?category=${category.category}`}
                    className="flex h-full items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-slate-900">{category.name}</span>
                      <span className="mt-1 block text-sm text-slate-600 tabular-nums">{category.jobs}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            headingLevel="h3"
            title="No job categories to show yet"
            description="Categories appear here once employers have open job posts."
            action={
              <Button asChild variant="outline">
                <Link href="/jobs">Browse all jobs</Link>
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}
