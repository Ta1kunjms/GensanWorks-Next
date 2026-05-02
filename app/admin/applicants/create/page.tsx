"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, UserPlus, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import JobseekerProfileWizard from "@/jobseeker/profile/profile-wizard";

export default function AdminCreateJobseekerPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // We rely on the wizard to gather all the other fields.
  // When the wizard's Save is clicked, it calls onSaveProfile and onSaveResume simultaneously.
  // We will intercept them, combine the data, and make ONE API call.

  const profileResolveRef = useRef<((value: any) => void) | null>(null);
  const resumeResolveRef = useRef<((value: any) => void) | null>(null);

  const handleSaveProfile = async (profileData: any) => {
    return new Promise<void>((resolve, reject) => {
      profileResolveRef.current = resolve;
      attemptCreation(profileData, null).catch(reject);
    });
  };

  const handleSaveResume = async (resumeData: any) => {
    return new Promise<void>((resolve, reject) => {
      resumeResolveRef.current = resolve;
      attemptCreation(null, resumeData).catch(reject);
    });
  };

  const combinedPayloadRef = useRef<{ profile: any; resume: any }>({ profile: null, resume: null });

  const attemptCreation = async (profileData: any, resumeData: any) => {
    if (profileData) combinedPayloadRef.current.profile = profileData;
    if (resumeData) combinedPayloadRef.current.resume = resumeData;

    // Proceed only if both are received
    if (!combinedPayloadRef.current.profile || !combinedPayloadRef.current.resume) {
      return;
    }

    if (!email || !password) {
      setError("Email and Password are required to create an account.");
      if (profileResolveRef.current) profileResolveRef.current(undefined);
      if (resumeResolveRef.current) resumeResolveRef.current(undefined);
      combinedPayloadRef.current = { profile: null, resume: null };
      return;
    }

    setCreating(true);
    setError("");

    try {
      const payload = {
        email,
        password,
        profile: combinedPayloadRef.current.profile,
        resume: combinedPayloadRef.current.resume,
      };

      const res = await fetch("/api/admin/jobseekers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create jobseeker");
      }

      // Success
      if (profileResolveRef.current) profileResolveRef.current(undefined);
      if (resumeResolveRef.current) resumeResolveRef.current(undefined);
      
      router.push("/admin/applicants");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      if (profileResolveRef.current) profileResolveRef.current(undefined);
      if (resumeResolveRef.current) resumeResolveRef.current(undefined);
      combinedPayloadRef.current = { profile: null, resume: null };
    } finally {
      setCreating(false);
    }
  };

  const initialProfile = {};
  const initialResume = {
    education: [],
    experience: [],
    trainings: [],
    languages: [],
    licenses: [],
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link href="/admin/applicants">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5 text-slate-500" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Create Jobseeker</h1>
          <p className="text-sm text-slate-500 font-medium">Manually register a jobseeker with full NSRP details.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <Card className="p-6 rounded-[2rem] border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600" /> Account Credentials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 outline-none"
              placeholder="e.g. juan@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 outline-none"
              placeholder="Minimum 8 characters"
              required
            />
          </div>
        </div>
      </Card>

      <div className="opacity-90">
        <JobseekerProfileWizard
          initialProfile={initialProfile}
          initialResume={initialResume}
          onSaveProfile={handleSaveProfile}
          onSaveResume={handleSaveResume}
        />
      </div>

      {creating && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-200">
            <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-slate-700">Provisioning Jobseeker Profile...</span>
          </div>
        </div>
      )}
    </div>
  );
}
