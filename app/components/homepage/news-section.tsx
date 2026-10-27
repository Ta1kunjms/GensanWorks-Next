"use client";

import React from "react";
import Link from "next/link";
import { MapPin, ChevronRight, Newspaper } from "lucide-react";
import { Accent, CARD, CARD_HOVER, CONTAINER, Eyebrow, SECTION_Y, SectionLead, SectionTitle } from "./landing-shared";

interface NewsItem {
  id?: string;
  type?: string;
  title: string;
  excerpt?: string;
  description?: string;
  location?: string;
  date?: string;
  published_at?: string;
  color?: string;
  link?: string;
  link_url?: string;
}

interface NewsSectionProps {
  news?: NewsItem[];
  loading?: boolean;
}

const gradientMap: Record<string, string> = {
  'bg-blue-600': 'from-blue-500 to-indigo-600',
  'bg-green-600': 'from-emerald-500 to-teal-600',
  'bg-purple-600': 'from-indigo-500 to-violet-600',
};

export function NewsSection({ news, loading = false }: NewsSectionProps) {
  // Real rows from /api/landing/news only; nothing is rendered when there are none.
  const displayNews = news ?? [];
  if (!loading && displayNews.length === 0) return null;
  return (
    <section aria-labelledby="news-heading" className={`relative w-full bg-white ${SECTION_Y}`}>
      <div className={CONTAINER}>
        <div className="mb-12 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Eyebrow icon={Newspaper}>Stay Informed</Eyebrow>
            <SectionTitle id="news-heading" className="mt-5">
              Latest News &amp; <Accent>Announcements</Accent>
            </SectionTitle>
          </div>
          <SectionLead className="max-w-md">
            The latest employment opportunities, feature updates, and events in General Santos City.
          </SectionLead>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} aria-hidden="true" className={`${CARD} h-80 motion-safe:animate-pulse`} />
            ))
          ) : (
            displayNews.map((item, index) => {
              const color = item.color || (index % 3 === 0 ? 'bg-blue-600' : index % 3 === 1 ? 'bg-green-600' : 'bg-purple-600');
              const gradient = gradientMap[color] || 'from-slate-500 to-slate-700';
              const dateDisplay = item.date || (item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Recent');

              return (
                <Link
                  href={item.link || item.link_url || '#'}
                  key={item.id || index}
                  className={`group flex h-full flex-col overflow-hidden ${CARD} ${CARD_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                >
                  <div aria-hidden="true" className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
                  <div className="flex flex-grow flex-col p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
                        {item.type || 'NEWS'}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-slate-600 tabular-nums">
                        {dateDisplay}
                      </span>
                    </div>

                    <h3 className="text-balance text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-700">
                      {item.title}
                    </h3>

                    <p className="mt-3 mb-6 flex-grow text-base leading-relaxed text-slate-600">
                      {item.description || item.excerpt || 'Read the latest updates from PESO General Santos City.'}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.location || 'General Santos City'}</span>
                      </div>
                      <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 transition-colors group-hover:bg-blue-50">
                        <ChevronRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-blue-700" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
