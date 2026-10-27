"use client";

import React from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Accent, CONTAINER, Eyebrow, SECTION_Y, SectionLead, SectionTitle } from "./landing-shared";

// Showreel copied from Files/GensanWorks_Showreel_v2_HQ.mp4 (owner decision 2026-10-23).
// Native controls; playback starts only when the user presses play. Captions (WCAG 1.2.2): fill in
// docs/showreel-captions-template.vtt, save it as public/videos/gensanworks-showreel.en.vtt, then set
// SHOWREEL_CAPTIONS_SRC to "/videos/gensanworks-showreel.en.vtt". Until then no caption track is rendered.
export const SHOWREEL_SRC = "/videos/gensanworks-showreel.mp4";
export const SHOWREEL_CAPTIONS_SRC: string | null = null;

export function VideoSection() {
  return (
    <section aria-labelledby="video-heading" className={`relative w-full overflow-hidden bg-slate-950 ${SECTION_Y}`}>
      {/* Cinematic Background Glows */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className={CONTAINER}>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          {/* Left Content */}
          <div className="min-w-0">
            <Eyebrow tone="dark" icon={PlayCircle}>Watch the Showreel</Eyebrow>

            <SectionTitle id="video-heading" tone="dark" className="mt-5">
              How <Accent tone="dark">GensanWorks</Accent> works
            </SectionTitle>

            <SectionLead tone="dark" className="mt-4 max-w-lg">
              A short walkthrough of the platform: how jobseekers build a profile and apply,
              how employers post vacancies, and how PESO General Santos City reviews, refers and
              follows up.
            </SectionLead>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/about" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-8 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                Learn More About PESO
              </Link>
            </div>
          </div>

          {/* Right - Video */}
          <div className="relative min-w-0">
            {/* Ambient shadow behind video */}
            <div aria-hidden="true" className="absolute -inset-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-2xl opacity-20" />

            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              <video
                className="h-full w-full bg-black object-contain"
                controls
                preload="metadata"
                playsInline
                aria-label="GensanWorks showreel: how GensanWorks works"
              >
                <source src={SHOWREEL_SRC} type="video/mp4" />
                {SHOWREEL_CAPTIONS_SRC ? (
                  <track kind="captions" src={SHOWREEL_CAPTIONS_SRC} srcLang="en" label="English" default />
                ) : null}
                Your browser cannot play this video.{" "}
                <a href={SHOWREEL_SRC} className="underline">Download the GensanWorks showreel (MP4)</a>.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
