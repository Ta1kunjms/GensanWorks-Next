"use client";

import React from "react";
import { Users, Building2, Briefcase, BarChart3, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ImpactMetrics {
  avgTimeToInterview: string;
  avgSalary: string;
  satisfactionRate: string;
  yearsOfService: number;
}

interface SummaryData {
  totalApplicants: { value: number };
  activeEmployers: { value: number };
  successfulReferrals: { value: number };
}

interface ImpactMetricsSectionProps {
  summaryData?: SummaryData;
  impactData?: ImpactMetrics;
  isLoading?: boolean;
  impactLoading?: boolean;
}

const formatNumber = (num: number) => num.toLocaleString();

export function ImpactMetricsSection({
  summaryData,
  impactData,
  isLoading = false,
  impactLoading = false,
}: ImpactMetricsSectionProps) {
  const stats = {
    jobseekersRegistered: summaryData?.totalApplicants?.value || 0,
    employersParticipating: summaryData?.activeEmployers?.value || 0,
    jobsMatched: summaryData?.successfulReferrals?.value || 0,
  };

  return (
    <section className="w-full bg-slate-50 py-32 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <BarChart3 className="w-4 h-4" />
            Our Track Record
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Our Impact in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Numbers</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Real-time data-driven results connecting talent with opportunity in General Santos City.
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Jobseekers */}
          <div className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border border-slate-200/60 transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100/50">
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +24%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold text-sm mb-2">Total Jobseekers</p>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {isLoading ? <Skeleton className="h-10 w-24" /> : formatNumber(stats.jobseekersRegistered)}
                </div>
              </div>
            </div>
          </div>

          {/* Employers */}
          <div className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border border-slate-200/60 transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100/50">
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +18%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold text-sm mb-2">Partner Employers</p>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {isLoading ? <Skeleton className="h-10 w-24" /> : formatNumber(stats.employersParticipating)}
                </div>
              </div>
            </div>
          </div>

          {/* Placements */}
          <div className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border border-slate-200/60 transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100/50">
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +32%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold text-sm mb-2">Successful Placements</p>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {isLoading ? <Skeleton className="h-10 w-24" /> : formatNumber(stats.jobsMatched)}
                </div>
              </div>
            </div>
          </div>

          {/* Satisfaction */}
          <div className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border border-slate-200/60 transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-6 h-6 text-amber-600" />
                </div>
                <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100/50">
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +15%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-slate-500 font-semibold text-sm mb-2">Satisfaction Rate</p>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {impactLoading ? <Skeleton className="h-10 w-20" /> : impactData?.satisfactionRate || "94.5%"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Impact Stats Bento */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-blue-100 font-semibold mb-2">Avg Time to First Interview</p>
              <div className="text-4xl font-black tracking-tight">
                {impactLoading ? <Skeleton className="h-10 w-20 bg-white/20" /> : impactData?.avgTimeToInterview || "48 hrs"}
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <p className="text-emerald-100 font-semibold mb-2">Avg Starting Salary</p>
              <div className="text-4xl font-black tracking-tight">
                {impactLoading ? <Skeleton className="h-10 w-20 bg-white/20" /> : impactData?.avgSalary || "₱32.5K"}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/10 backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-slate-400 font-semibold mb-2">Serving General Santos City</p>
              <div className="text-4xl font-black tracking-tight">
                {impactLoading ? <Skeleton className="h-10 w-20 bg-white/10" /> : `${impactData?.yearsOfService || 25} years`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}