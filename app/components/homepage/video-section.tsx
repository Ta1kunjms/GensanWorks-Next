"use client";

import React from "react";
import Link from "next/link";
import { Play, TrendingUp } from "lucide-react";

export function VideoSection() {
  return (
    <section className="w-full bg-[#030712] py-32 relative overflow-hidden">
      {/* Cinematic Background Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                Watch Our Story
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Empowering <br/> GenSan's Workforce Since <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">1999</span>
            </h2>
            
            <p className="text-lg text-slate-400 leading-relaxed font-light max-w-lg">
              Learn how PESO General Santos City has been connecting talent with opportunity for over two decades, creating sustainable employment and driving economic growth in our community.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="group relative inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-xl font-bold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Play className="w-4 h-4 mr-2 fill-white relative z-10" />
                <span className="relative z-10">Play Documentary</span>
              </button>
              <Link href="/about" className="group inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold transition-all duration-300">
                Learn More About PESO
              </Link>
            </div>
          </div>

          {/* Right - Video Placeholder */}
          <div className="relative group">
            {/* Ambient shadow behind video */}
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
            
            <div className="aspect-[16/10] bg-slate-800 rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/10">
              {/* Video background substitute */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-40 mix-blend-luminosity" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#030712] via-transparent to-blue-900/50" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-white group-hover:border-white transition-all duration-500 cursor-pointer shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                  <Play className="w-8 h-8 text-white group-hover:text-blue-600 ml-1 transition-colors" />
                </button>
              </div>
              
              {/* Stats overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">95%</div>
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Success Rate</div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-white/60 text-sm font-medium">Documentary • 4:20</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}