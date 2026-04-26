"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Globe,
  Star,
  Target,
  TrendingUp,
  Laptop,
  Wrench,
  Stethoscope,
  HeadphonesIcon,
  Shield,
  Clock,
  Award,
} from "lucide-react";

type Partner = {
  id?: string;
  name: string;
  tagline?: string;
  icon?: React.ElementType;
  logo_url?: string;
};

interface PartnersSectionProps {
  partners?: Partner[];
  loading?: boolean;
}

const industryPartners: Partner[] = [
  { name: "General Milling Corp", tagline: "Food Manufacturing", icon: Building2 },
  { name: "SM City General Santos", tagline: "Retail & Lifestyle", icon: Briefcase },
  { name: "Dole Philippines", tagline: "Agri & Export", icon: Globe },
  { name: "Gaisano Mall", tagline: "Shopping & Leisure", icon: Star },
  { name: "Robinsons Place", tagline: "Retail Group", icon: Target },
  { name: "KCC Mall", tagline: "Regional Retail", icon: TrendingUp },
  { name: "Mindanao Tech Hub", tagline: "Technology Park", icon: Laptop },
  { name: "South Cotabato Steelworks", tagline: "Industrial & Steel", icon: Wrench },
  { name: "SOCCSKSARGEN Medical", tagline: "Healthcare Network", icon: Stethoscope },
  { name: "Pioneer Contact Center", tagline: "BPO & Support", icon: HeadphonesIcon },
];

const trustSignals = [
  {
    title: "Government Certified",
    description: "Official PESO platform",
    icon: Shield,
    accent: "bg-blue-50 text-blue-600",
  },
  {
    title: "Data Protected",
    description: "Secure by design",
    icon: Clock,
    accent: "bg-blue-50 text-blue-600",
  },
  {
    title: "Service Excellence",
    description: "ISO-aligned workflows",
    icon: Award,
    accent: "bg-slate-100 text-slate-600",
  },
];

export function PartnersSection({ partners, loading = false }: PartnersSectionProps) {
  const displayPartners = partners && partners.length > 0 ? partners : (loading ? [] : industryPartners);
  const marqueeRef = useRef<HTMLDivElement>(null);

  const partnerMarqueeItems = [...industryPartners, ...industryPartners];

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    let isScrolling = true;
    let scrollPos = 0;

    const scroll = () => {
      if (!isScrolling) return;
      scrollPos += 1;
      if (marquee) {
        marquee.scrollLeft = scrollPos;
      }
      if (scrollPos >= marquee.scrollWidth / 2) {
        scrollPos = 0;
      }
      requestAnimationFrame(scroll);
    };

    const animationId = requestAnimationFrame(scroll);

    return () => {
      isScrolling = false;
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section className="relative w-full bg-white border-y border-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Trust Signals */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {trustSignals.map((signal) => (
            <div
              key={signal.title}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-3"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${signal.accent}`}
              >
                <signal.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                <p className="text-xs text-slate-500">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Network Header */}
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.4em] mb-3">
            Trusted by Regional Employers
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            Partner network expanding weekly
          </h2>
        </div>

        {/* Partner Marquee */}
        <div className="overflow-hidden">
          {loading ? (
            <div className="flex gap-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="min-w-[220px] h-20 bg-slate-50 rounded-2xl border border-slate-100" />
              ))}
            </div>
          ) : displayPartners.length > 0 ? (
            <div
              ref={marqueeRef}
              className="flex gap-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              aria-hidden="true"
            >
              {[...displayPartners, ...displayPartners].map((partner, index) => {
                const Icon = partner.icon || Building2;
                return (
                  <div
                    key={`${partner.name}-${index}`}
                    className="min-w-[220px] rounded-2xl border border-slate-100 bg-white px-5 py-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                      {partner.logo_url ? (
                        <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">
                        {partner.name}
                      </p>
                      <p className="text-xs text-slate-500">{partner.tagline}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm font-medium">No partners listed yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}