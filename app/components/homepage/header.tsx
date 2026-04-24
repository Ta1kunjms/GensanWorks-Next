"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface GeneralSettings {
  siteName: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  aboutTitle: string;
  aboutBody: string;
}

const defaultSettings: GeneralSettings = {
  siteName: "GensanWorks",
  heroHeadline: "Connecting jobseekers and employers in General Santos City",
  heroSubheadline: "A single window for opportunities, referrals, and PESO services",
  primaryCTA: "Browse Jobs",
  secondaryCTA: "Post a Vacancy",
  aboutTitle: "Why GensanWorks",
  aboutBody: "PESO-led platform for job matching, referrals, and analytics across the city.",
};

interface HeaderPropSettings {
  generalSettings?: GeneralSettings;
}

export function Header({ generalSettings = defaultSettings }: HeaderPropSettings) {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-5">
          {/* Logo with PESO Image */}
          <Link href="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="h-14 w-14 bg-transparent flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
              <Image 
                src="/peso-gsc-logo.png" 
                alt="GensanWorks Logo" 
                width={56}
                height={56}
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight">
                <span className="text-red-600">Gensan</span>
                <span className="text-blue-600">Works</span>
              </span>
              <span className="text-xs text-slate-500">
                Public Employment Service Office
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/#services"
              className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium"
            >
              Services
            </Link>
            <Link
              href="/#how-it-works"
              className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium"
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium"
            >
              Contact
            </Link>

            {/* Login / Get Started */}
            <div className="flex items-center gap-2 ml-6 pl-6 border-l border-slate-200">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="font-medium text-sm"
                >
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="font-medium text-sm bg-blue-600 hover:bg-blue-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button - visible on small screens */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-50">
            <svg
              className="w-6 h-6 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}