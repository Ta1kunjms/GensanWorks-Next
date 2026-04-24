"use client";

import { FormEvent, useState } from "react";
import { Camera, Save, Loader2, Building2, MapPin, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EmployerProfileWizard({
  initialProfile,
  onSave,
}: {
  initialProfile: Record<string, any>;
  onSave: (payload: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    establishmentName: initialProfile.establishment_name || "",
    industry: initialProfile.industry || "",
    industryCode: initialProfile.industry_code || "",
    contactPerson: initialProfile.contact_person || "",
    contactPhone: initialProfile.contact_phone || "",
    designation: initialProfile.designation || "",
    companyTaxId: initialProfile.company_tax_id || "",
    
    province: initialProfile.province || "",
    city: initialProfile.city || "",
    barangay: initialProfile.barangay || "",
    address: initialProfile.address || "",
    zipCode: initialProfile.zip_code || "",

    totalPaidEmployees: initialProfile.total_paid_employees || 0,
    totalVacantPositions: initialProfile.total_vacant_positions || 0,
    
    website: initialProfile.website || "",
    description: initialProfile.description || "",
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
      <Card className="p-4 h-fit sticky top-6">
        <nav className="flex flex-col gap-2">
          <Button variant={activeTab === "company" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("company")}>
            <Building2 className="mr-2 h-4 w-4" /> Company Info
          </Button>
          <Button variant={activeTab === "location" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("location")}>
            <MapPin className="mr-2 h-4 w-4" /> Location
          </Button>
          <Button variant={activeTab === "srs" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("srs")}>
            <BarChart3 className="mr-2 h-4 w-4" /> SRS Details
          </Button>
          <Button variant={activeTab === "docs" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("docs")}>
            <FileText className="mr-2 h-4 w-4" /> Documents
          </Button>
        </nav>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeTab === "company" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Establishment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Establishment Name</label>
                  <input name="establishmentName" value={form.establishmentName} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Industry</label>
                  <input name="industry" value={form.industry} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Contact Person</label>
                  <input name="contactPerson" value={form.contactPerson} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Designation</label>
                  <input name="designation" value={form.designation} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Contact Phone</label>
                  <input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => setActiveTab("location")}>Next: Location</Button>
              </div>
            </div>
          )}

          {activeTab === "location" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Office Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Province</label>
                  <input name="province" value={form.province} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">City / Municipality</label>
                  <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Barangay</label>
                  <input name="barangay" value={form.barangay} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Street Address</label>
                  <input name="address" value={form.address} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setActiveTab("company")}>Back</Button>
                <Button type="button" onClick={() => setActiveTab("srs")}>Next: SRS Details</Button>
              </div>
            </div>
          )}

          {activeTab === "srs" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">SRS Form 2 Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Total Paid Employees</label>
                  <input type="number" name="totalPaidEmployees" value={form.totalPaidEmployees} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Total Vacant Positions</label>
                  <input type="number" name="totalVacantPositions" value={form.totalVacantPositions} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Company Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setActiveTab("location")}>Back</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}

          {activeTab === "docs" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Supporting Documents</h3>
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Upload high-quality scans of your company documents for verification.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-dashed flex flex-col items-center justify-center text-center space-y-2">
                    <FileText className="h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium">SRS Form 2</span>
                    <Button variant="outline" size="sm">Upload PDF</Button>
                  </Card>
                  <Card className="p-4 border-dashed flex flex-col items-center justify-center text-center space-y-2">
                    <FileText className="h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium">Business Permit</span>
                    <Button variant="outline" size="sm">Upload PDF</Button>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
