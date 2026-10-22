"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { compressImage } from "@/lib/image-utils";
import { handleApiError } from "@/lib/error-utils";
import JobseekerProfileWizard, { JobseekerProfileWizardRef } from "./profile-wizard";

type JobseekerProfile = Record<string, any>;

export default function JobseekerProfilePage() {
  const [profile, setProfile] = useState<JobseekerProfile | null>(null);
  const [resume, setResume] = useState({
    education: [],
    experience: [],
    trainings: [],
    languages: [],
    licenses: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const wizardRef = useRef<JobseekerProfileWizardRef>(null);
  const router = useRouter();

  const handleGlobalSave = async () => {
    if (wizardRef.current) {
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        // Trigger save for both profile and resume to be sure everything is persisted
        await wizardRef.current.saveAll();
        setSuccess("Profile and resume changes saved successfully.");
        router.refresh();
        await loadData();
      } catch (err) {
        setSuccess(""); // Clear any partial success messages
        setError("One or more sections failed to save. Please try again.");
      } finally {
        setSaving(false);
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [profileRes, resumeRes] = await Promise.all([
        fetch("/api/jobseeker/profile", { cache: "no-store" }),
        fetch("/api/jobseeker/resume", { cache: "no-store" })
      ]);
      
      const profileData = await profileRes.json();
      const resumeData = await resumeRes.json();

      if (!profileRes.ok || !profileData.profile) {
        setError(profileData.error ?? "Unable to load profile");
        return;
      }

      setProfile(profileData.profile);
      setResume({
        education: resumeData.education || [],
        experience: resumeData.experience || [],
        trainings: resumeData.trainings || [],
        languages: resumeData.languages || [],
        licenses: resumeData.licenses || [],
      });
    } catch {
      setError("Unable to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const uploadProfileImage = async (file: File) => {
    setUploadingImage(true);
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

      const data = await response.json();
      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to upload profile image");
        return;
      }

      setProfile((prev) => (prev ? { ...prev, profile_image: data.url } : prev));
      setSuccess(data.message ?? "Profile image uploaded. Save your profile to keep it current.");
      router.refresh();
    } catch {
      setError("Unable to upload profile image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = useCallback(async (payload: Record<string, any>) => {
    try {
      const response = await fetch("/api/jobseeker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const handled = await handleApiError(response, { showToast: false });
        setError(handled.message);
        throw new Error(handled.message);
      }

      const data = await response.json();
      if (data.profile) {
        setProfile(data.profile);
      }

      // Success message is handled by the caller (handleGlobalSave or individual submit)
    } catch (err: any) {
      if (!error) setError(err.message || "Unable to update profile");
      throw err;
    }
  }, [error]);

  const handleSaveResume = useCallback(async (payload: Record<string, any>) => {
    try {
      const response = await fetch("/api/jobseeker/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const handled = await handleApiError(response, { showToast: false });
        setError(handled.message);
        throw new Error(handled.message);
      }

      const data = await response.json();
      // Success message is handled by the caller
    } catch (err: any) {
      if (!error) setError(err.message || "Unable to update resume");
      throw err;
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none text-slate-500" aria-hidden="true" />
        <span className="sr-only">Loading profile…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState title="Profile not found." />
    );
  }

  const completionPercent = profile.profile_completeness ?? 0;
  const profileImageSrc = profile.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Jobseeker Profile"
        description="National Skills Registration Program (NSRP Form 1)"
        actions={
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-600">Completeness</p>
            <p className="text-xl font-semibold text-slate-900 tabular-nums">{completionPercent}%</p>
          </div>
          <div className="h-10 w-10 rounded-full border-4 border-slate-100 flex items-center justify-center relative" aria-hidden="true">
            <svg className="h-10 w-10 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
              <circle cx="20" cy="20" r="16" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={100} strokeDashoffset={100 - completionPercent} className="text-slate-900 transition-all duration-1000 motion-reduce:transition-none" />
            </svg>
          </div>
        </div>
        }
      />

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}
      {success && <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg">{success}</div>}

      <div className="grid gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-lg bg-slate-100 overflow-hidden border">
                <img src={profileImageSrc} alt="Profile" className="h-full w-full object-cover" />
              </div>
              <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/90 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Camera className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Change profile photo</span>
                <input type="file" className="sr-only" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadProfileImage(e.target.files[0])} />
              </label>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 break-words">{profile.first_name} {profile.last_name}</h2>
              <p className="text-slate-600 break-all">{profile.email}</p>
              <div className="mt-2 flex gap-2 justify-center md:justify-start">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">{profile.employment_status || 'Status Unknown'}</span>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Button onClick={handleGlobalSave} disabled={saving} size="lg" className="w-full px-6 sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4 mr-2" aria-hidden="true" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Card>

        <JobseekerProfileWizard 
          ref={wizardRef}
          initialProfile={profile} 
          initialResume={resume}
          onSaveProfile={handleSaveProfile} 
          onSaveResume={handleSaveResume}
        />
      </div>
    </div>
  );
}
