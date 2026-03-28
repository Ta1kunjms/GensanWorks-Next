"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type JobseekerProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  currentOccupation: string | null;
  employmentStatus: string | null;
  educationLevel: string | null;
  skills: string[] | null;
  preferredLocations: string[] | null;
  preferredIndustries: string[] | null;
  profileImage: string | null;
};

export default function JobseekerProfilePage() {
  const [profile, setProfile] = useState<JobseekerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
    currentOccupation: "",
    employmentStatus: "",
    educationLevel: "",
    skills: "",
    preferredLocations: "",
    preferredIndustries: "",
    profileImage: "",
  });

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/jobseeker/profile", { cache: "no-store" });
      if (!response.ok) {
        setError("Unable to load profile");
        return;
      }

      const data = (await response.json()) as { profile: JobseekerProfile };
      const nextProfile = data.profile;
      setProfile(nextProfile);
      setForm({
        name: nextProfile.name ?? "",
        phone: nextProfile.phone ?? "",
        address: nextProfile.address ?? "",
        city: nextProfile.city ?? "",
        province: nextProfile.province ?? "",
        zipCode: nextProfile.zipCode ?? "",
        currentOccupation: nextProfile.currentOccupation ?? "",
        employmentStatus: nextProfile.employmentStatus ?? "",
        educationLevel: nextProfile.educationLevel ?? "",
        skills: (nextProfile.skills ?? []).join(", "),
        preferredLocations: (nextProfile.preferredLocations ?? []).join(", "),
        preferredIndustries: (nextProfile.preferredIndustries ?? []).join(", "),
        profileImage: nextProfile.profileImage ?? "",
      });
    } catch {
      setError("Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const uploadProfileImage = async (file: File) => {
    setUploadingImage(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/profile-image", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { error?: string; url?: string; message?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to upload profile image");
        return;
      }

      setForm((prev) => ({ ...prev, profileImage: data.url ?? "" }));
      setSuccess(data.message ?? "Profile image uploaded. Save profile to persist it.");
    } catch {
      setError("Unable to upload profile image");
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/jobseeker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          province: form.province || null,
          zipCode: form.zipCode || null,
          currentOccupation: form.currentOccupation || null,
          employmentStatus: form.employmentStatus || null,
          educationLevel: form.educationLevel || null,
          skills: form.skills
            ? form.skills.split(",").map((item) => item.trim()).filter(Boolean)
            : null,
          preferredLocations: form.preferredLocations
            ? form.preferredLocations.split(",").map((item) => item.trim()).filter(Boolean)
            : null,
          preferredIndustries: form.preferredIndustries
            ? form.preferredIndustries.split(",").map((item) => item.trim()).filter(Boolean)
            : null,
          profileImage: form.profileImage || null,
        }),
      });

      const data = (await response.json()) as { error?: string; profile?: JobseekerProfile; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to update profile");
        return;
      }

      if (data.profile) {
        setProfile(data.profile);
      }
      setSuccess(data.message ?? "Profile updated");
    } catch {
      setError("Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-600">Manage your account and job preferences.</p>
      </div>

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading profile...</p>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700 md:col-span-2">{success}</p> : null}

            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Email</label>
              <input className="w-full rounded border px-3 py-2 bg-slate-100" value={profile?.email ?? ""} disabled />
            </div>

            <div>
              <label className="text-sm text-slate-700">Name</label>
              <input className="w-full rounded border px-3 py-2" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">Phone</label>
              <input className="w-full rounded border px-3 py-2" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Address</label>
              <input className="w-full rounded border px-3 py-2" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">City</label>
              <input className="w-full rounded border px-3 py-2" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Province</label>
              <input className="w-full rounded border px-3 py-2" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">ZIP Code</label>
              <input className="w-full rounded border px-3 py-2" value={form.zipCode} onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Current Occupation</label>
              <input className="w-full rounded border px-3 py-2" value={form.currentOccupation} onChange={(e) => setForm((p) => ({ ...p, currentOccupation: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Employment Status</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={form.employmentStatus}
                onChange={(e) => setForm((p) => ({ ...p, employmentStatus: e.target.value }))}
              >
                <option value="">Select status</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Employed">Employed</option>
                <option value="Self-employed">Self-employed</option>
                <option value="Student">Student</option>
                <option value="Retired">Retired</option>
                <option value="OFW">OFW</option>
                <option value="Freelancer">Freelancer</option>
                <option value="4PS">4PS</option>
                <option value="PWD">PWD</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-700">Education Level</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={form.educationLevel}
                onChange={(e) => setForm((p) => ({ ...p, educationLevel: e.target.value }))}
              >
                <option value="">Select level</option>
                <option value="Elementary">Elementary</option>
                <option value="High School">High School</option>
                <option value="Vocational">Vocational</option>
                <option value="Associate">Associate</option>
                <option value="Bachelor">Bachelor</option>
                <option value="Master">Master</option>
                <option value="Doctorate">Doctorate</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Skills (comma-separated)</label>
              <input className="w-full rounded border px-3 py-2" value={form.skills} onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Preferred Locations (comma-separated)</label>
              <input className="w-full rounded border px-3 py-2" value={form.preferredLocations} onChange={(e) => setForm((p) => ({ ...p, preferredLocations: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Preferred Industries (comma-separated)</label>
              <input className="w-full rounded border px-3 py-2" value={form.preferredIndustries} onChange={(e) => setForm((p) => ({ ...p, preferredIndustries: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Profile Image URL</label>
              <input className="w-full rounded border px-3 py-2" value={form.profileImage} onChange={(e) => setForm((p) => ({ ...p, profileImage: e.target.value }))} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void uploadProfileImage(file);
                    }
                  }}
                />
                <p className="text-xs text-slate-500">Allowed: JPG, PNG, WEBP up to 5MB</p>
              </div>
              {uploadingImage ? <p className="mt-1 text-xs text-slate-600">Uploading image...</p> : null}
            </div>

            <Button type="submit" disabled={saving} className="md:col-span-2">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
