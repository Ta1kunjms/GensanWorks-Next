"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmployerProfileWizard from "@/employer/profile/employer-wizard";

export default function AdminCreateEmployerPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSaveProfile = async (profileData: any) => {
    if (!email || !password) {
      setError("Email and Password are required to create an account.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const payload = {
        email,
        password,
        profile: profileData,
      };

      const res = await fetch("/api/admin/employers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create employer");
      }

      router.push("/admin/employers");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const initialProfile = {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link href="/admin/employers">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5 text-slate-500" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Create Employer</h1>
          <p className="text-sm text-slate-500 font-medium">Manually register an employer with full SRS Form 2 details.</p>
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
          <Building2 className="h-5 w-5 text-indigo-600" /> Account Credentials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 outline-none"
              placeholder="e.g. hr@company.com"
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
        <EmployerProfileWizard
          initialProfile={initialProfile}
          onSave={handleSaveProfile}
        />
      </div>

      {creating && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-200">
            <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-slate-700">Provisioning Employer Profile...</span>
          </div>
        </div>
      )}
    </div>
  );
}
