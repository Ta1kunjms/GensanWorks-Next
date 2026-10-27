"use client";

import React from "react";
import Link from "next/link";

// Showreel copied from Files/GensanWorks_Showreel_v2_HQ.mp4 (owner decision 2026-10-23).
// Native controls; playback starts only when the user presses play. Captions/transcript are not available yet (WCAG 1.2.2);
// add a <track kind="captions"> here once the owner supplies a .vtt file.
export const SHOWREEL_SRC = "/videos/gensanworks-showreel.mp4";

export function VideoSection() {
  return (
    <section aria-labelledby="video-heading" className="w-full bg-[#030712] py-32 relative overflow-hidden">
      {/* Cinematic Background Glows */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                Watch the Showreel
              </span>
            </div>

            <h2 id="video-heading" className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              How <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">GensanWorks</span> works
            </h2>

            <p className="text-lg text-slate-300 leading-relaxed font-light max-w-lg">
              A short walkthrough of the platform: how jobseekers build a profile and apply,
              how employers post vacancies, and how PESO General Santos City reviews, refers and
              follows up.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/about" className="group inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold transition-all duration-300">
                Learn More About PESO
              </Link>
            </div>
          </div>

          {/* Right - Video */}
          <div className="relative group">
            {/* Ambient shadow behind video */}
            <div aria-hidden="true" className="absolute -inset-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />

            <div className="aspect-video bg-slate-800 rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/10">
              <video
                className="h-full w-full bg-black object-contain"
                controls
                preload="metadata"
                playsInline
                aria-label="GensanWorks showreel: how GensanWorks works"
              >
                <source src={SHOWREEL_SRC} type="video/mp4" />
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
