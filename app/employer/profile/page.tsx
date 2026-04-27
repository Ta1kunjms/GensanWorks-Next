"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { compressImage } from "@/lib/image-utils";
import { handleApiError } from "@/lib/error-utils";
import EmployerProfileWizard from "./employer-wizard";

type EmployerProfile = Record<string, any>;

export default function EmployerProfilePage() {
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const router = useRouter();

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

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setError("");
    setSuccess("");

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch("/api/upload/profile-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const handled = await handleApiError(response);
        setError(handled.message);
        return;
      }

      const data = await response.json();
      setProfile((prev) => (prev ? { ...prev, profile_image: data.url } : prev));
      setSuccess("Logo uploaded successfully. Save profile to apply changes.");
      router.refresh();
    } catch {
      setError("Unable to upload logo. Please check your connection.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (payload: Record<string, any>) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/employer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const handled = await handleApiError(response);
        setError(handled.message);
        return;
      }

      const data = await response.json();
      if (data.data?.profile) {
        setProfile(data.data.profile);
      }
      setSuccess(data.data?.message ?? "Profile updated");
    } catch {
      setError("Unable to update profile. Please try again.");
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
      <div className="grid gap-6">
        <Card className="p-6 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900" />
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-md flex items-center justify-center">
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-10 w-10 text-slate-400" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 h-8 w-8 bg-slate-900 text-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-lg transition-transform active:scale-95">
                <Camera className="h-4 w-4" />
                <input type="file" className="hidden" accept="image/*" disabled={uploadingLogo} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </label>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-900">{profile.establishment_name}</h2>
              <p className="text-slate-500">{profile.email}</p>
              <div className="mt-2 flex gap-2 justify-center md:justify-start">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-md uppercase tracking-wider">
                  {profile.account_status || 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">{success}</div>}

      <EmployerProfileWizard initialProfile={profile} onSave={handleSave} />
    </div>
  );
}
