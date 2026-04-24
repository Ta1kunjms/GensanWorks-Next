"use client";

import React from "react";
import {
  Zap,
  Shield,
  Clock,
  Globe,
  TrendingUp,
  Award,
  Users,
  CheckCircle,
  Target,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ImpactMetrics {
  avgTimeToInterview: string;
  avgSalary: string;
  satisfactionRate: string;
  yearsOfService: number;
}

interface WhyChooseUsSectionProps {
  impactData?: ImpactMetrics;
  impactLoading: boolean;
  trustSignals: Array<{
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }>;
  expectedSkillsShortage: Array<{
    skillCluster: string;
    projectedGap: string;
    timeframe: string;
    driver: string;
    focus: string;
  }>;
  shortageInitiatives: Array<{
    title: string;
    description: string;
    owner: string;
  }>;
  skillsData: Array<{
    skill: string;
    percentage: number;
  }>;
  skillsLoading: boolean;
  skillColorClasses: Array<{
    text: string;
    bar: string;
  }>;
  generalSettings: {
    aboutTitle: string;
    aboutBody: string;
  };
}

export function WhyChooseUsSection({
  impactData,
  impactLoading,
  trustSignals,
  expectedSkillsShortage,
  shortageInitiatives,
  skillsData,
  skillsLoading,
  skillColorClasses,
  generalSettings,
}: WhyChooseUsSectionProps) {
  return (
    <section className="w-full bg-white section-normal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - About Text & Trust Signals */}
          <div>
            <h2 className="section-title mb-5">{generalSettings.aboutTitle}</h2>
            <p className="section-copy mb-8">{generalSettings.aboutBody}</p>

            {/* Trust Signals */}
            <div className="space-y-4">
              {trustSignals.map((signal, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div
                    className={`w-6 h-6 rounded-full ${signal.accent} flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    <signal.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {signal.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{signal.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Skills Demand Chart */}
            <div className="mt-10 bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Top In-Demand Skills
              </h3>
              <div className="space-y-3">
                {skillsLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </>
                ) : (
                  skillsData.slice(0, 5).map((skillItem, index) => (
                    <div key={skillItem.skill}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">
                          {skillItem.skill}
                        </span>
                        <span className="text-gray-500">
                          {skillItem.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${
                            skillColorClasses[index]?.bar || "from-blue-500 to-blue-600"
                          }`}
                          style={{ width: `${skillItem.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Impact & Shortage */}
          <div className="space-y-8">
            {/* Impact Metrics */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Our Impact
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {impactLoading ? (
                      <Skeleton className="h-10 w-20 mx-auto" />
                    ) : (
                      impactData?.avgTimeToInterview || "2 days"
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Time to Interview</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {impactLoading ? (
                      <Skeleton className="h-10 w-20 mx-auto" />
                    ) : (
                      impactData?.satisfactionRate || "95%"
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Satisfaction Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {impactLoading ? (
                      <Skeleton className="h-10 w-20 mx-auto" />
                    ) : (
                      `₱${impactData?.avgSalary || "25k"}`
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Starting Salary</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {impactLoading ? (
                      <Skeleton className="h-10 w-20 mx-auto" />
                    ) : (
                      `${impactData?.yearsOfService || "5"} years`
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Years of Service</div>
                </div>
              </div>
            </div>

            {/* Skills Shortage Tracker */}
            <div className="bg-red-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Skills Shortage Tracker
              </h3>
              <div className="space-y-4">
                {expectedSkillsShortage.slice(0, 4).map((shortage, index) => (
                  <div
                    key={shortage.skillCluster}
                    className="bg-white rounded-lg p-4 border border-red-100"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900">
                        {shortage.skillCluster}
                      </span>
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                        {shortage.projectedGap}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      {shortage.timeframe} · {shortage.driver}
                    </p>
                    <p className="text-xs text-gray-600">Focus: {shortage.focus}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Gap Initiatives */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-green-600" />
                PESO Initiatives
              </h3>
              <div className="space-y-3">
                {shortageInitiatives.slice(0, 3).map((initiative, index) => (
                  <div
                    key={initiative.title}
                    className="flex items-start space-x-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {initiative.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {initiative.description}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {initiative.owner}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}