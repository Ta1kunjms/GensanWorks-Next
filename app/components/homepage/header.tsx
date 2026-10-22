"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
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

const navLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const MOBILE_MENU_ID = "homepage-mobile-menu";

export function Header({ generalSettings = defaultSettings }: HeaderPropSettings) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      // Return focus to the toggle so keyboard users are not left on a hidden link.
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* First focusable element on the page; target is <main id="main-content"> in app/page.tsx. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <header ref={headerRef} className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo with PESO Image */}
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/peso-gsc-logo.png"
                alt=""
                width={56}
                height={56}
                className="h-12 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight">
                  <span className="text-red-600">Gensan</span>
                  <span className="text-blue-600">Works</span>
                </span>
                <span className="text-xs text-slate-600">Public Employment Service Office</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}

              {/* Login / Get Started */}
              <div className="ml-6 flex items-center gap-2 border-l border-slate-200 pl-6">
                <Button asChild variant="ghost">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            </nav>

            {/* Mobile menu toggle - visible on small screens */}
            <Button
              ref={toggleRef}
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-expanded={menuOpen}
              aria-controls={MOBILE_MENU_ID}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        <nav
          id={MOBILE_MENU_ID}
          aria-label="Mobile"
          hidden={!menuOpen}
          className="border-t border-slate-200 bg-white lg:hidden"
        >
          <ul className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex gap-2 border-t border-slate-200 pt-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login" onClick={closeMenu}>
                  Login
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/signup" onClick={closeMenu}>
                  Get Started
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      </header>
    </>
  );
}
