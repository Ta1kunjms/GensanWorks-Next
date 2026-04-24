"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Code, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SkillsData {
  skill: string;
  percentage: number;
}

interface SkillsDemandSectionProps {
  skillsData?: SkillsData[];
  loading?: boolean;
}

const defaultSkills = [
  { skill: "Customer Support", percentage: 92 },
  { skill: "Digital Marketing", percentage: 88 },
  { skill: "Accounting", percentage: 84 },
  { skill: "Front-End Development", percentage: 81 },
  { skill: "Healthcare Assistance", percentage: 79 },
  { skill: "Logistics Management", percentage: 75 },
  { skill: "Sales Strategy", percentage: 73 },
  { skill: "Technical Support", percentage: 69 },
];

const colors = ['blue', 'purple', 'pink', 'orange', 'cyan', 'green', 'indigo', 'teal'];

export function SkillsDemandSection({
  skillsData = defaultSkills,
  loading = false,
}: SkillsDemandSectionProps) {
  const displaySkills = skillsData.length > 0 ? skillsData : defaultSkills;

  return (
    <section className="w-full py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <TrendingUp className="w-4 h-4" />
            Market Insights
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Top Skills in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Demand</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Real-time data on what employers in General Santos are actively looking for right now.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Dashboard Panel */}
          <div className="bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden border border-slate-800">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
                  <Code className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Live Skill Tracker
                  </h3>
                  <p className="text-slate-400 text-sm">Updated weekly from job posts</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-8 relative z-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-full">
                    <div className="flex justify-between mb-3">
                      <Skeleton className="h-4 w-1/3 bg-slate-800" />
                      <Skeleton className="h-4 w-12 bg-slate-800" />
                    </div>
                    <Skeleton className="h-2 w-full bg-slate-800 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                {displaySkills.map((item, index) => {
                  const colorMap: Record<string, string> = {
                    blue: "from-blue-400 to-blue-600",
                    purple: "from-purple-400 to-purple-600",
                    pink: "from-pink-400 to-pink-600",
                    orange: "from-orange-400 to-orange-600",
                    cyan: "from-cyan-400 to-cyan-600",
                    green: "from-emerald-400 to-emerald-600",
                    indigo: "from-indigo-400 to-indigo-600",
                    teal: "from-teal-400 to-teal-600"
                  };
                  const colorKey = colors[index % colors.length] || 'blue';
                  const gradient = colorMap[colorKey] || "from-blue-400 to-blue-600";
                  
                  return (
                    <div key={item.skill} className="group">
                      <div className="flex justify-between items-end mb-2.5">
                        <span className="font-semibold text-slate-200 text-sm tracking-wide">
                          {item.skill}
                        </span>
                        <span className="text-white font-bold text-sm bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50 shadow-inner">
                        <div 
                          className={`bg-gradient-to-r ${gradient} h-full rounded-full relative`}
                          style={{ width: `${item.percentage}%` }}
                        >
                          <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-white/30 to-transparent" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Training Programs CTA */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-10 flex flex-col justify-center items-start text-left shadow-xl relative overflow-hidden border border-blue-500/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-6 shadow-inner">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                Want to master these skills?
              </h3>
              <p className="text-blue-100 text-base mb-8 font-light leading-relaxed">
                PESO General Santos offers FREE subsidized training programs to help you develop the most sought-after competencies in the market.
              </p>
              <Link
                href="/training"
                className="group inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-4 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300"
              >
                Browse Training Programs 
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}