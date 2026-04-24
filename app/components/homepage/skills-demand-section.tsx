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
    <section className="w-full py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
            Market Insights
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Top Skills in Demand
          </h2>
          <p className="text-base text-slate-600">
            What employers in General Santos are looking for right now
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <Code className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Most In-Demand Skills from Our Database
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-3.5">
              {displaySkills.map((item, index) => {
                const color = colors[index % colors.length];
                
                return (
                  <div key={item.skill}>
                    <div className="flex justify-between mb-1.5">
                      <span className="font-semibold text-slate-900 text-sm">
                        {item.skill}
                      </span>
                      <span className={`text-${color}-600 font-semibold text-sm`}>
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r from-${color}-500 to-${color}-600 h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Training Programs CTA */}
        <div className="mt-8 bg-blue-600 rounded-xl p-8 text-center shadow-lg">
          <h3 className="text-xl font-bold text-white mb-2">
            Want to learn these skills?
          </h3>
          <p className="text-blue-100 text-sm mb-5">
            PESO General Santos offers FREE training programs to help you develop in-demand skills
          </p>
          <Link
            href="/training"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
          >
            Browse Training Programs <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}