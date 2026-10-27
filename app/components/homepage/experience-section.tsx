"use client";

import React from "react";
import Link from "next/link";
import { Clock, Smartphone, GraduationCap, HeadphonesIcon, FileText } from "lucide-react";

const experienceHighlights = [
  { 
    title: "Responsive Everywhere", 
    description: "Desktop, tablet, or mobile—continue applications seamlessly.",
    icon: Smartphone 
  },
  { 
    title: "Career Coaching", 
    description: "PESO counselors help polish resumes and prep interviews.",
    icon: GraduationCap 
  },
  { 
    title: "Human + AI Support", 
    description: "AI-assisted suggestions; PESO staff and employers make the decisions.",
    icon: HeadphonesIcon 
  },
  { 
    title: "Skills Mapping", 
    description: "List certificates and NC II levels so they count toward job suggestions.",
    icon: FileText 
  },
];

export function ExperienceSection() {
  return (
    <section aria-labelledby="experience-heading" className="relative w-full bg-[#0a0f1c] text-white py-32 overflow-hidden">
      {/* Dynamic Background */}
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px" }}></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-300 text-xs font-bold tracking-widest uppercase shadow-sm">
              <Clock className="w-4 h-4" aria-hidden="true" />
              How PESO Helps
            </div>
            <h2 id="experience-heading" className="text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight">
              Human guidance meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">automation</span> for everyone.
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed font-light">
              PESO staff help with registration, referrals and follow-up, and the platform works on desktop, tablet and phone, so you can start at the PESO office and continue at home.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/contact" className="group relative inline-flex items-center justify-center bg-white text-slate-900 px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Schedule Orientation
              </Link>
              <Link href="/help" className="group inline-flex items-center justify-center border border-white/20 bg-white/5 text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:bg-white/10">
                See Support Programs
              </Link>
            </div>
            
          </div>
          
          {/* Right Grid */}
          <div className="grid sm:grid-cols-2 gap-5 relative">
            <div aria-hidden="true" className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/30 blur-[60px] rounded-full z-0" />
            
            {experienceHighlights.map((item, index) => (
              <div 
                key={item.title} 
                className={`relative z-10 group rounded-[2rem] bg-white/5 border border-white/10 p-8 backdrop-blur-xl transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:-translate-y-2 ${index % 2 !== 0 ? 'sm:mt-12' : ''}`}
              >
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                <div className="relative">
                  <div aria-hidden="true" className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-500">
                    <item.icon className="w-7 h-7 text-blue-300" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-white">{item.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}