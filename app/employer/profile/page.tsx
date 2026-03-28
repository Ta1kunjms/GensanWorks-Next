"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EmployerProfile = {
  id: string;
  email: string;
  contactPerson: string;
  contactPhone: string;
  establishmentName: string;
  industry: string | null;
  companyType: string | null;
  companySize: string | null;
  businessNature: string | null;
  address: string;
  city: string;
  province: string;
  zipCode: string | null;
  website: string | null;
  description: string | null;
  yearsInOperation: number | null;
  logoUrl: string | null;
  srsFormFile: string | null;
  businessPermitFile: string | null;
  bir2303File: string | null;
  doleCertificationFile: string | null;
  companyProfileFile: string | null;
  accountStatus: string | null;
};

const complianceDocumentFields = [
  { key: "srsFormFile", label: "SRS Form" },
  { key: "businessPermitFile", label: "Business Permit" },
  { key: "bir2303File", label: "BIR 2303" },
  { key: "doleCertificationFile", label: "DOLE Certification" },
  { key: "companyProfileFile", label: "Company Profile" },
] as const;

type ComplianceDocumentKey = (typeof complianceDocumentFields)[number]["key"];

export default function EmployerProfilePage() {
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<ComplianceDocumentKey | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    contactPerson: "",
    contactPhone: "",
    establishmentName: "",
    industry: "",
    companyType: "",
    companySize: "",
    businessNature: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
    website: "",
    description: "",
    yearsInOperation: "",
    logoUrl: "",
    srsFormFile: "",
    businessPermitFile: "",
    bir2303File: "",
    doleCertificationFile: "",
    companyProfileFile: "",
  });

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/employer/profile", { cache: "no-store" });
      if (!response.ok) {
        setError("Unable to load profile");
        return;
      }

      const data = (await response.json()) as { profile: EmployerProfile };
      const nextProfile = data.profile;
      setProfile(nextProfile);
      setForm({
        contactPerson: nextProfile.contactPerson ?? "",
        contactPhone: nextProfile.contactPhone ?? "",
        establishmentName: nextProfile.establishmentName ?? "",
        industry: nextProfile.industry ?? "",
        companyType: nextProfile.companyType ?? "",
        companySize: nextProfile.companySize ?? "",
        businessNature: nextProfile.businessNature ?? "",
        address: nextProfile.address ?? "",
        city: nextProfile.city ?? "",
        province: nextProfile.province ?? "",
        zipCode: nextProfile.zipCode ?? "",
        website: nextProfile.website ?? "",
        description: nextProfile.description ?? "",
        yearsInOperation:
          typeof nextProfile.yearsInOperation === "number" ? String(nextProfile.yearsInOperation) : "",
        logoUrl: nextProfile.logoUrl ?? "",
        srsFormFile: nextProfile.srsFormFile ?? "",
        businessPermitFile: nextProfile.businessPermitFile ?? "",
        bir2303File: nextProfile.bir2303File ?? "",
        doleCertificationFile: nextProfile.doleCertificationFile ?? "",
        companyProfileFile: nextProfile.companyProfileFile ?? "",
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

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
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
        setError(data.error ?? "Unable to upload logo");
        return;
      }

      setForm((prev) => ({ ...prev, logoUrl: data.url ?? "" }));
      setSuccess(data.message ?? "Logo uploaded. Save profile to persist it.");
    } catch {
      setError("Unable to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadComplianceDocument = async (documentType: ComplianceDocumentKey, file: File) => {
    setUploadingDocument(documentType);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("file", file);

      const response = await fetch("/api/upload/employer-document", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { error?: string; message?: string; url?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to upload compliance document");
        return;
      }

      setForm((prev) => ({ ...prev, [documentType]: data.url ?? "" }));
      setSuccess(data.message ?? "Document uploaded. Save profile to persist it.");
    } catch {
      setError("Unable to upload compliance document");
    } finally {
      setUploadingDocument(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/employer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: form.contactPerson,
          contactPhone: form.contactPhone,
          establishmentName: form.establishmentName,
          industry: form.industry || null,
          companyType: form.companyType || null,
          companySize: form.companySize || null,
          businessNature: form.businessNature || null,
          address: form.address,
          city: form.city,
          province: form.province,
          zipCode: form.zipCode || null,
          website: form.website || null,
          description: form.description || null,
          yearsInOperation: form.yearsInOperation ? Number(form.yearsInOperation) : null,
          logoUrl: form.logoUrl || null,
          srsFormFile: form.srsFormFile || null,
          businessPermitFile: form.businessPermitFile || null,
          bir2303File: form.bir2303File || null,
          doleCertificationFile: form.doleCertificationFile || null,
          companyProfileFile: form.companyProfileFile || null,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string; profile?: EmployerProfile };
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
        <h2 className="text-2xl font-bold text-slate-900">Company Profile</h2>
        <p className="text-sm text-slate-600">Manage your company and contact information.</p>
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
              <label className="text-sm text-slate-700">Contact Person</label>
              <input className="w-full rounded border px-3 py-2" value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">Contact Phone</label>
              <input className="w-full rounded border px-3 py-2" value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">Establishment Name</label>
              <input className="w-full rounded border px-3 py-2" value={form.establishmentName} onChange={(e) => setForm((p) => ({ ...p, establishmentName: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">Industry</label>
              <input className="w-full rounded border px-3 py-2" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Company Type</label>
              <input className="w-full rounded border px-3 py-2" value={form.companyType} onChange={(e) => setForm((p) => ({ ...p, companyType: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Company Size</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={form.companySize}
                onChange={(e) => setForm((p) => ({ ...p, companySize: e.target.value }))}
              >
                <option value="">Select company size</option>
                <option value="Micro">Micro</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Business Nature</label>
              <input className="w-full rounded border px-3 py-2" value={form.businessNature} onChange={(e) => setForm((p) => ({ ...p, businessNature: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Address</label>
              <input className="w-full rounded border px-3 py-2" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">City</label>
              <input className="w-full rounded border px-3 py-2" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">Province</label>
              <input className="w-full rounded border px-3 py-2" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm text-slate-700">ZIP Code</label>
              <input className="w-full rounded border px-3 py-2" value={form.zipCode} onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-slate-700">Years in Operation</label>
              <input className="w-full rounded border px-3 py-2" type="number" min={0} value={form.yearsInOperation} onChange={(e) => setForm((p) => ({ ...p, yearsInOperation: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Website</label>
              <input className="w-full rounded border px-3 py-2" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Description</label>
              <textarea className="w-full rounded border px-3 py-2" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-700">Logo URL</label>
              <input className="w-full rounded border px-3 py-2" value={form.logoUrl} onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void uploadLogo(file);
                    }
                  }}
                />
                <p className="text-xs text-slate-500">Allowed: JPG, PNG, WEBP up to 5MB</p>
              </div>
              {uploadingLogo ? <p className="mt-1 text-xs text-slate-600">Uploading logo...</p> : null}
            </div>

            <div className="md:col-span-2 mt-2 border-t pt-4">
              <h3 className="text-base font-semibold text-slate-900">Compliance Documents</h3>
              <p className="text-xs text-slate-600 mb-3">Upload PDF, JPG, or PNG files up to 10MB.</p>

              <div className="space-y-3">
                {complianceDocumentFields.map((field) => (
                  <div key={field.key} className="rounded border p-3">
                    <label className="text-sm text-slate-700">{field.label} URL</label>
                    <input
                      className="w-full rounded border px-3 py-2 mt-1"
                      value={form[field.key]}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void uploadComplianceDocument(field.key, file);
                          }
                        }}
                      />
                      {form[field.key] ? (
                        <a
                          href={form[field.key]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Open file
                        </a>
                      ) : null}
                    </div>
                    {uploadingDocument === field.key ? (
                      <p className="mt-1 text-xs text-slate-600">Uploading {field.label.toLowerCase()}...</p>
                    ) : null}
                  </div>
                ))}
              </div>
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
