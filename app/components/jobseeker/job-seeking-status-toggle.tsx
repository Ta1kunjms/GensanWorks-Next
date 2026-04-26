"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type JobSeekingStatus = "actively_looking" | "open" | "not_looking";

const STATUS_CONFIG: Record<JobSeekingStatus, { label: string; description: string; color: string; dot: string; bg: string; border: string }> = {
  actively_looking: {
    label: "Actively Looking",
    description: "Open to all opportunities immediately",
    color: "text-emerald-700",
    dot: "bg-emerald-500 animate-pulse",
    bg: "bg-emerald-50 hover:bg-emerald-100",
    border: "border-emerald-300",
  },
  open: {
    label: "Open to Opportunities",
    description: "Not urgent, but willing to explore",
    color: "text-amber-700",
    dot: "bg-amber-400",
    bg: "bg-amber-50 hover:bg-amber-100",
    border: "border-amber-300",
  },
  not_looking: {
    label: "Not Looking",
    description: "Currently employed / not seeking",
    color: "text-slate-600",
    dot: "bg-slate-400",
    bg: "bg-slate-50 hover:bg-slate-100",
    border: "border-slate-200",
  },
};

interface JobSeekingStatusToggleProps {
  initialStatus?: JobSeekingStatus;
}

export function JobSeekingStatusToggle({ initialStatus = "not_looking" }: JobSeekingStatusToggleProps) {
  const [status, setStatus] = useState<JobSeekingStatus>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const currentConfig = STATUS_CONFIG[status];

  const updateStatus = async (newStatus: JobSeekingStatus) => {
    if (newStatus === status || loading) return;
    setLoading(true);
    setShowDropdown(false);
    try {
      const res = await fetch("/api/jobseeker/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } catch {
      // silent fail — status reverts
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium shadow-sm ${currentConfig.bg} ${currentConfig.border} ${currentConfig.color}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : (
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${currentConfig.dot}`} />
        )}
        <span>{currentConfig.label}</span>
        <svg className="w-3.5 h-3.5 ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-2 z-20 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Job-Seeking Status
              </p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {(Object.entries(STATUS_CONFIG) as [JobSeekingStatus, typeof STATUS_CONFIG[JobSeekingStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => void updateStatus(key)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    key === status ? `${cfg.bg} ${cfg.border} border` : "hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${cfg.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold ${key === status ? cfg.color : "text-slate-700"}`}>
                      {cfg.label}
                      {key === status && (
                        <span className="ml-2 text-[10px] font-medium opacity-70">(current)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{cfg.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] text-slate-400">
                💡 Set to <strong>Actively Looking</strong> to appear in the AI matching pool and receive referrals from PESO.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
