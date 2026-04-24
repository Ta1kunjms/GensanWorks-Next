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
    <section className="w-full bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.4em] uppercase text-blue-600 mb-3">
            Our Track Record
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Our Impact in Numbers
          </h2>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            Data-driven results connecting talent with opportunity in General Santos City.
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Jobseekers */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="px-2 py-0.5 bg-green-50 rounded-full">
                <span className="text-xs font-semibold text-green-700 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +24%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(stats.jobseekersRegistered)}
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Jobseekers</p>
            <p className="text-xs text-slate-500 mt-1">Active profiles this year</p>
          </div>

          {/* Employers */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-green-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="px-2 py-0.5 bg-green-50 rounded-full">
                <span className="text-xs font-semibold text-green-700 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +18%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(stats.employersParticipating)}
            </div>
            <p className="text-sm text-slate-600 font-medium">Partner Employers</p>
            <p className="text-xs text-slate-500 mt-1">Verified companies</p>
          </div>

          {/* Placements */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-purple-50 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div className="px-2 py-0.5 bg-green-50 rounded-full">
                <span className="text-xs font-semibold text-green-700 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +32%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(stats.jobsMatched)}
            </div>
            <p className="text-sm text-slate-600 font-medium">Successful Placements</p>
            <p className="text-xs text-slate-500 mt-1">Jobs matched & filled</p>
          </div>

          {/* Satisfaction */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
              <div className="px-2 py-0.5 bg-green-50 rounded-full">
                <span className="text-xs font-semibold text-green-700 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +15%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {impactLoading ? <Skeleton className="h-8 w-20" /> : impactData?.satisfactionRate || "94.5%"}
            </div>
            <p className="text-sm text-slate-600 font-medium">Satisfaction Rate</p>
            <p className="text-xs text-slate-500 mt-1">User feedback score</p>
          </div>
        </div>

        {/* Additional Impact Stats */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-3xl font-bold mb-1">
              {impactLoading ? <Skeleton className="h-8 w-20 bg-blue-500" /> : impactData?.avgTimeToInterview || "48 hrs"}
            </div>
            <p className="text-blue-100 text-sm font-medium">Average Time to First Interview</p>
          </div>
          <div className="bg-green-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-3xl font-bold mb-1">
              {impactLoading ? <Skeleton className="h-8 w-20 bg-green-500" /> : impactData?.avgSalary || "₱32.5K"}
            </div>
            <p className="text-green-100 text-sm font-medium">Average Starting Salary</p>
          </div>
          <div className="bg-purple-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-3xl font-bold mb-1">
              {impactLoading ? <Skeleton className="h-8 w-20 bg-purple-500" /> : `${impactData?.yearsOfService || 25} years`}
            </div>
            <p className="text-purple-100 text-sm font-medium">Serving General Santos City</p>
          </div>
        </div>
      </div>
    </section>
  );
}