"use client";

import React from "react";
import Link from "next/link";
import { Play, TrendingUp } from "lucide-react";

export function VideoSection() {
  return (
    <section className="w-full bg-slate-900 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                Watch Our Story
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Empowering GenSan's Workforce Since 1999
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Learn how PESO General Santos City has been connecting talent with opportunity for over two decades, creating sustainable employment and driving economic growth in our community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-lg font-semibold text-sm inline-flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <Play className="w-4 h-4 mr-2" />
                Watch Video
              </button>
              <Link href="/about">
                <button className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900 px-6 py-5 rounded-lg font-semibold text-sm hover:shadow-lg transition-all">
                  Learn More About PESO
                </button>
              </Link>
            </div>
          </div>

          {/* Right - Video Placeholder */}
          <div className="relative">
            <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl overflow-hidden shadow-lg relative hover:shadow-2xl transition-shadow">
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors cursor-pointer">
                <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg">
                  <Play className="w-8 h-8 text-blue-600 ml-1" />
                </div>
              </div>
              {/* Placeholder logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">PESO</span>
                </div>
              </div>
            </div>
            
            {/* Stats overlay */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">95%</div>
                  <div className="text-xs text-slate-600">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}