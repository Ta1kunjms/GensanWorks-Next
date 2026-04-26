export const dynamic = "force-dynamic";
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import EmployerProfileWizard from "./employer-wizard";

type EmployerProfile = Record<string, any>;

export default function EmployerProfilePage() {
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/employer/profile", { cache: "no-store" });
      const payload = await response.json();
      
      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "Unable to load profile");
        return;
      }

      setProfile(payload.data.profile);
    } catch {
      setError("Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleSave = async (payload: Record<string, any>) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/employer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error?.message ?? "Unable to update profile");
        return;
      }

      if (data.data?.profile) {
        setProfile(data.data.profile);
      }
      setSuccess(data.data?.message ?? "Profile updated");
    } catch {
      setError("Unable to update profile");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="p-6 text-center text-slate-600">
        Profile not found.
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employer Profile</h1>
          <p className="text-slate-500">Establishment Registration (SRS Form 2)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">
          {profile.account_status || 'Pending'}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">{success}</div>}

      <EmployerProfileWizard initialProfile={profile} onSave={handleSave} />
    </div>
  );
}
