"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
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
  profileComplete?: boolean | null;
  profileCompleteness?: number | null;
};

const defaultForm = {
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
};

type CompletionItem = {
  label: string;
  filled: boolean;
};

function csvToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCompletionItems(form: typeof defaultForm): CompletionItem[] {
  return [
    { label: "Personal info", filled: Boolean(form.name.trim()) },
    { label: "Contact info", filled: Boolean(form.phone.trim()) },
    { label: "Address", filled: Boolean(form.address.trim() && form.city.trim() && form.province.trim()) },
    { label: "ZIP code", filled: Boolean(form.zipCode.trim()) },
    { label: "Career details", filled: Boolean(form.currentOccupation.trim() || form.employmentStatus.trim()) },
    { label: "Education", filled: Boolean(form.educationLevel.trim()) },
    { label: "Skills", filled: Boolean(form.skills.trim()) },
    { label: "Preferences", filled: Boolean(form.preferredLocations.trim() || form.preferredIndustries.trim()) },
    { label: "Photo", filled: Boolean(form.profileImage.trim()) },
  ];
}

export default function JobseekerProfilePage() {
  const [profile, setProfile] = useState<JobseekerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(defaultForm);

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/jobseeker/profile", { cache: "no-store" });
      const data = (await response.json()) as { profile?: JobseekerProfile; error?: string };

      if (!response.ok || !data.profile) {
        setError(data.error ?? "Unable to load profile");
        return;
      }

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

  const completionItems = useMemo(() => buildCompletionItems(form), [form]);
  const completionCount = completionItems.filter((item) => item.filled).length;
  const completionPercent = profile?.profileCompleteness ?? Math.round((completionCount / completionItems.length) * 100);
  const profileImageSrc =
    form.profileImage || profile?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id ?? "jobseeker"}`;

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
      setProfile((prev) => (prev ? { ...prev, profileImage: data.url ?? "" } : prev));
      setSuccess(data.message ?? "Profile image uploaded. Save your profile to keep it current.");
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
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          zipCode: form.zipCode.trim() || null,
          currentOccupation: form.currentOccupation.trim() || null,
          employmentStatus: form.employmentStatus.trim() || null,
          educationLevel: form.educationLevel.trim() || null,
          skills: form.skills ? csvToArray(form.skills) : null,
          preferredLocations: form.preferredLocations ? csvToArray(form.preferredLocations) : null,
          preferredIndustries: form.preferredIndustries ? csvToArray(form.preferredIndustries) : null,
          profileImage: form.profileImage.trim() || null,
        }),
      });

      const data = (await response.json()) as { error?: string; profile?: JobseekerProfile; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to update profile");
        return;
      }

      if (data.profile) {
        setProfile(data.profile);
        setForm({
          name: data.profile.name ?? "",
          phone: data.profile.phone ?? "",
          address: data.profile.address ?? "",
          city: data.profile.city ?? "",
          province: data.profile.province ?? "",
          zipCode: data.profile.zipCode ?? "",
          currentOccupation: data.profile.currentOccupation ?? "",
          employmentStatus: data.profile.employmentStatus ?? "",
          educationLevel: data.profile.educationLevel ?? "",
          skills: (data.profile.skills ?? []).join(", "),
          preferredLocations: (data.profile.preferredLocations ?? []).join(", "),
          preferredIndustries: (data.profile.preferredIndustries ?? []).join(", "),
          profileImage: data.profile.profileImage ?? "",
        });
      }

      setSuccess(data.message ?? "Profile updated");
    } catch {
      setError("Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
          <p className="text-sm text-slate-600">Manage your account and job preferences.</p>
        </div>
        <Card className="p-6">
          <p className="text-sm text-slate-600">Loading profile...</p>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
          <p className="text-sm text-slate-600">Manage your account and job preferences.</p>
        </div>
        <Card className="p-6">
          <p className="text-center text-slate-600">No profile data found. Please contact administrator.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-600">Keep your details updated for better job matching and referrals.</p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {success ? (
        <Card className="border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{success}</p>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div
                className="h-28 w-28 rounded-3xl bg-slate-100 bg-cover bg-center shadow-inner ring-4 ring-white"
                style={{ backgroundImage: `url(${profileImageSrc})` }}
              />
              <label className="absolute -bottom-2 -right-2 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 p-3 text-white shadow-lg transition hover:bg-slate-700">
                <Camera className="h-4 w-4" />
                <input
                  id="jobseeker-profile-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadProfileImage(file);
                    }
                  }}
                />
              </label>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-900">{profile.name || "Jobseeker"}</h3>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Profile Completion</span>
                <span className="font-semibold text-slate-900">{completionPercent}%</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {profile.profileComplete ? "Profile is ready for matching." : "Complete the remaining sections to improve matching."}
              </p>
            </div>

            <div className="w-full space-y-2 text-left">
              {completionItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.filled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                  )}
                  <span className={item.filled ? "text-slate-900" : "text-slate-500"}>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left">
              <p className="text-xs uppercase tracking-wide text-slate-500">Quick tips</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                <li>Keep your contact details current.</li>
                <li>Add skills and preferences for stronger matches.</li>
                <li>Use a clear profile photo to improve trust.</li>
              </ul>
            </div>

            {uploadingImage ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading image...
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input className="mt-1 w-full rounded border border-slate-200 bg-slate-100 px-3 py-2" value={profile.email} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Current Occupation</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.currentOccupation}
                  onChange={(event) => setForm((prev) => ({ ...prev, currentOccupation: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Employment Status</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.employmentStatus}
                  onChange={(event) => setForm((prev) => ({ ...prev, employmentStatus: event.target.value }))}
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
                <label className="text-sm font-medium text-slate-700">Education Level</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.educationLevel}
                  onChange={(event) => setForm((prev) => ({ ...prev, educationLevel: event.target.value }))}
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
              <div>
                <label className="text-sm font-medium text-slate-700">Province</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.province}
                  onChange={(event) => setForm((prev) => ({ ...prev, province: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">City</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">ZIP Code</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.zipCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, zipCode: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Address</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Skills (comma-separated)</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.skills}
                  onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Preferred Locations (comma-separated)</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.preferredLocations}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredLocations: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Preferred Industries (comma-separated)</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.preferredIndustries}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredIndustries: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Profile Image URL</label>
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-3 py-2"
                  value={form.profileImage}
                  onChange={(event) => setForm((prev) => ({ ...prev, profileImage: event.target.value }))}
                  placeholder="https://..."
                />
                <p className="mt-2 text-xs text-slate-500">
                  You can also upload an image with the button on the left. Allowed types: JPG, PNG, WEBP up to 5MB.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={loadProfile} disabled={saving}>
                Reset
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
