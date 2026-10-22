"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroSettings {
  siteName: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
}

interface HeroSectionProps {
  generalSettings: HeroSettings;
}

// Hero: the only level-1 heading, a plain job search (GET /jobs?search=…, the param the jobs page
// reads) and the two existing calls to action. No statistics here; the numbers
// section shows only what /api/summary returns.
export function HeroSection({ generalSettings }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-heading" className="w-full border-b border-slate-200 bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-medium text-primary">
            {generalSettings.siteName} · Public Employment Service Office, General Santos City
          </p>

          <h1 id="hero-heading" className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {generalSettings.heroHeadline}
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            {generalSettings.heroSubheadline}
          </p>

          <form action="/jobs" method="get" role="search" className="max-w-xl">
            <label htmlFor="hero-job-search" className="block text-sm font-medium text-slate-900">
              Search jobs
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Input
                id="hero-job-search"
                name="search"
                type="search"
                placeholder="Job title or keyword"
                aria-describedby="hero-job-search-note"
                className="h-11 sm:flex-1"
              />
              <Button type="submit" size="lg" className="sm:w-auto">
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                Search
              </Button>
            </div>
            {/* /jobs is behind jobseeker sign-in; say so up front. */}
            <p id="hero-job-search-note" className="mt-2 text-sm text-slate-600">
              Sign in or register as a jobseeker to see results.
            </p>
          </form>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/jobs">
                {generalSettings.primaryCTA}
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/employer/jobs">{generalSettings.secondaryCTA}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
