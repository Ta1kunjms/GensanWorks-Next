"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

// Showreel copied from Files/GensanWorks_Showreel_v2_HQ.mp4 (owner decision 2026-10-23).
// Native controls; playback starts only when the user presses play. Captions/transcript are not available yet (WCAG 1.2.2);
// add a <track kind="captions"> here once the owner supplies a .vtt file.
export const SHOWREEL_SRC = "/videos/gensanworks-showreel.mp4";
// Navy poster with the PESO GSC logo and title (generated from /peso-gsc-logo.png).
export const SHOWREEL_POSTER = "/videos/showreel-poster.png";

/**
 * The 28 MB showreel is not requested on page load: the <video> element mounts only
 * once its frame scrolls near the viewport (IntersectionObserver), with preload="none"
 * so nothing downloads until the user presses play.
 */
function LazyShowreel() {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playRequested = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mounted && playRequested.current && videoRef.current) {
      playRequested.current = false;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [mounted]);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) {
      playRequested.current = true;
      setMounted(true);
      return;
    }
    video.focus();
    void video.play().catch(() => undefined);
  };

  return (
    <div ref={frameRef} className="aspect-video bg-slate-800 rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/10">
      {mounted ? (
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          controls
          preload="none"
          playsInline
          poster={SHOWREEL_POSTER}
          onPlay={() => setStarted(true)}
          aria-label="GensanWorks showreel: how GensanWorks works"
        >
          <source src={SHOWREEL_SRC} type="video/mp4" />
          Your browser cannot play this video.{" "}
          <a href={SHOWREEL_SRC} className="underline">Download the GensanWorks showreel (MP4)</a>.
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static poster in a fixed 16:9 frame; no layout shift
        <img src={SHOWREEL_POSTER} alt="" width={1280} height={720} loading="lazy" className="h-full w-full object-cover" />
      )}
      {!started ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Button
            type="button"
            size="lg"
            onClick={handlePlay}
            className="pointer-events-auto bg-white text-slate-900 hover:bg-blue-50 font-bold shadow-lg"
          >
            <Play className="w-5 h-5 mr-2" aria-hidden="true" />
            Play video
          </Button>
        </div>
      ) : null}
    </div>
  );
}

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

            <LazyShowreel />
          </div>
        </div>
      </div>
    </section>
  );
}
