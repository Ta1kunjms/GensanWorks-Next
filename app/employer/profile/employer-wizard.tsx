"use client";

import { FormEvent, useState, useEffect } from "react";
import { Save, Loader2, Building2, MapPin, BarChart3, FileText, CheckCircle2, AlertCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SRS_INDUSTRY_CODES } from "@/lib/validation-schemas";

const TABS = [
  { id: "company",    label: "Establishment",  icon: Building2 },
  { id: "location",   label: "Geographic",     icon: MapPin },
  { id: "contact",    label: "Contact & SRS",  icon: ClipboardList },
  { id: "docs",       label: "Documents",      icon: FileText },
] as const;

type Tab = typeof TABS[number]["id"];

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Input({ name, value, onChange, placeholder, type = "text", disabled }: {
  name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      name={name} value={value} onChange={onChange} type={type} placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function buildMatchReadiness(form: ReturnType<typeof buildForm>) {
  const checks = [
    { label: "Establishment Name",     ok: !!form.establishmentName },
    { label: "Industry Code (SRS 2)",  ok: !!form.industryCode },
    { label: "Company TIN",            ok: !!form.companyTaxId },
    { label: "Province / City",        ok: !!form.province && !!form.city },
    { label: "Barangay",               ok: !!form.barangay },
    { label: "Contact Person",         ok: !!form.contactPerson },
    { label: "Contact Phone",          ok: !!form.contactPhone },
    { label: "No. of Paid Employees",  ok: Number(form.totalPaidEmployees) > 0 },
    { label: "Vacant Positions",       ok: Number(form.totalVacantPositions) > 0 },
    { label: "SRS Subscriber Consent", ok: form.srsSubscriberIntent },
    { label: "Prepared By (SRS 2A)",   ok: !!form.srsPreparedBy },
  ];
  const done = checks.filter(c => c.ok).length;
  return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}

function buildForm(profile: Record<string, any>) {
  return {
    // SRS Form 2 - Establishment
    establishmentName:    profile.establishment_name     || "",
    industryCode:         profile.industry_code          || "",
    companyTaxId:         profile.company_tax_id         || "",
    totalPaidEmployees:   profile.total_paid_employees   ?? 0,
    totalVacantPositions: profile.total_vacant_positions ?? 0,
    srsSubscriberIntent:  profile.srs_subscriber_intent !== false, // default true

    // SRS Form 2 - Geographic
    province:             profile.province               || "",
    city:                 profile.city                   || "",
    barangay:             profile.barangay               || "",
    address:              profile.address                || "",
    zipCode:              profile.zip_code               || "",
    geographicCode:       profile.geographic_code        || "",
    barangayChairperson:  profile.barangay_chairperson   || "",
    barangaySecretary:    profile.barangay_secretary     || "",

    // SRS Form 2 - Contact
    contactPerson:        profile.contact_person         || "",
    contactPhone:         profile.contact_phone          || "",
    designation:          profile.designation            || "",

    // SRS Form 2A - Prepared by footer
    srsPreparedBy:          profile.srs_prepared_by          || "",
    srsPreparedDesignation: profile.srs_prepared_designation  || "",
    srsPreparedDate:        profile.srs_prepared_date         || "",
    srsPreparedContact:     profile.srs_prepared_contact      || "",

    // General
    description:  profile.description   || "",
    website:      profile.website        || "",
    profileImage: profile.profile_image  || "",
  };
}

export default function EmployerProfileWizard({
  initialProfile,
  onSave,
}: {
  initialProfile: Record<string, any>;
  onSave: (payload: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = useState(() => buildForm(initialProfile));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("company");

  useEffect(() => {
    if (initialProfile.profile_image) {
      setForm(prev => ({ ...prev, profileImage: initialProfile.profile_image }));
    }
  }, [initialProfile.profile_image]);

  const set = (field: keyof typeof form, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (type === "checkbox") {
      set(name as any, (e.target as HTMLInputElement).checked);
    } else if (type === "number") {
      set(name as any, parseInt(value) || 0);
    } else {
      set(name as any, value);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const readiness = buildMatchReadiness(form);
  const curIdx = TABS.findIndex(t => t.id === activeTab);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
      {/* Sidebar nav */}
      <div className="space-y-3">
        <Card className="p-4">
          <nav className="flex flex-col gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left ${
                  activeTab === id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Match Readiness Panel */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">SRS Readiness</p>
            <span className={`text-sm font-bold ${readiness.pct >= 80 ? "text-emerald-600" : readiness.pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>
              {readiness.pct}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${readiness.pct >= 80 ? "bg-emerald-500" : readiness.pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
              style={{ width: `${readiness.pct}%` }}
            />
          </div>
          <ul className="space-y-1.5">
            {readiness.checks.map(c => (
              <li key={c.label} className="flex items-center gap-2 text-xs">
                {c.ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  : <AlertCircle  className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                <span className={c.ok ? "text-slate-600" : "text-slate-400"}>{c.label}</span>
              </li>
            ))}
          </ul>
          {readiness.pct < 100 && (
            <p className="text-[10px] text-slate-400 pt-1">
              Complete all fields for full SRS Form 2 compliance and better job-seeker matching.
            </p>
          )}
        </Card>
      </div>

      {/* Main content */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ─── TAB 1: Establishment ─── */}
          {activeTab === "company" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Establishment Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Corresponds to SRS Form 2 — Establishment Listing Sheet</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label="Name of Establishment" required>
                    <Input name="establishmentName" value={form.establishmentName} onChange={handleChange} placeholder="e.g. KCC Mall of Gensan" />
                  </Field>
                </div>

                {/* Industry Code — 17 DOLE codes */}
                <div className="md:col-span-2">
                  <Field label="Type of Industry" required hint="SRS Form 2 — Column 4 / SRS Form 2A — Section 2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {SRS_INDUSTRY_CODES.map(({ code, label }) => (
                        <label
                          key={code}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-all ${
                            form.industryCode === code
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 hover:border-slate-400 text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="industryCode"
                            value={code}
                            checked={form.industryCode === code}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span className="font-bold shrink-0 w-5">{code}</span>
                          <span className="leading-snug">{label}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="No. of Paid Employees" hint="SRS Form 2 — Column 2">
                  <Input name="totalPaidEmployees" type="number" value={form.totalPaidEmployees} onChange={handleChange} placeholder="e.g. 50" />
                </Field>

                <Field label="No. of Vacant Positions" hint="SRS Form 2 — Column 3">
                  <Input name="totalVacantPositions" type="number" value={form.totalVacantPositions} onChange={handleChange} placeholder="e.g. 5" />
                </Field>

                <Field label="Company Tax Identification Number" hint="Required by SRS Form 2 footer">
                  <Input name="companyTaxId" value={form.companyTaxId} onChange={handleChange} placeholder="000-000-000-000" />
                </Field>

                <Field label="Company Website">
                  <Input name="website" value={form.website} onChange={handleChange} placeholder="https://example.com" />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Company Description">
                    <textarea
                      name="description" value={form.description} onChange={handleChange} rows={3}
                      placeholder="Brief description of your establishment's business activities..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none"
                    />
                  </Field>
                </div>

                {/* SRS subscriber opt-in */}
                <div className="md:col-span-2">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      name="srsSubscriberIntent"
                      checked={form.srsSubscriberIntent}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 rounded accent-slate-900"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        I consent to be included as a subscriber in the PESO SRS (Skills Registration System)
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        SRS Form 2 — Column 5. By checking this, your establishment agrees to be listed in the
                        PESO General Santos City SRS registry and to have job vacancies shared with registered jobseekers.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={() => setActiveTab("location")}>Next: Geographic →</Button>
              </div>
            </div>
          )}

          {/* ─── TAB 2: Geographic ─── */}
          {activeTab === "location" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Geographic Identification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Corresponds to SRS Form 2 — Geographic Identification header</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Province" required>
                  <Input name="province" value={form.province} onChange={handleChange} placeholder="e.g. South Cotabato" />
                </Field>
                <Field label="City / Municipality" required>
                  <Input name="city" value={form.city} onChange={handleChange} placeholder="e.g. General Santos City" />
                </Field>
                <Field label="Barangay">
                  <Input name="barangay" value={form.barangay} onChange={handleChange} placeholder="e.g. Brgy. Calumpang" />
                </Field>
                <Field label="Geographic Code" hint="Barangay/municipal geographic code from PSA">
                  <Input name="geographicCode" value={form.geographicCode} onChange={handleChange} placeholder="e.g. 129804001" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Complete Street Address">
                    <Input name="address" value={form.address} onChange={handleChange} placeholder="Building, Street, Subdivision" />
                  </Field>
                </div>
                <Field label="ZIP Code">
                  <Input name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="e.g. 9500" />
                </Field>

                <div className="md:col-span-2 mt-2 p-4 rounded-xl border border-blue-100 bg-blue-50 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Barangay Officials</p>
                  <p className="text-xs text-blue-600">As declared in SRS Form 2 header. Fill in the name of your barangay's officials.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Barangay Chairperson">
                      <Input name="barangayChairperson" value={form.barangayChairperson} onChange={handleChange} placeholder="Full name of Barangay Captain" />
                    </Field>
                    <Field label="Barangay Secretary">
                      <Input name="barangaySecretary" value={form.barangaySecretary} onChange={handleChange} placeholder="Full name of Barangay Secretary" />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setActiveTab("company")}>← Back</Button>
                <Button type="button" onClick={() => setActiveTab("contact")}>Next: Contact & SRS →</Button>
              </div>
            </div>
          )}

          {/* ─── TAB 3: Contact & SRS Prepared By ─── */}
          {activeTab === "contact" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Contact & SRS Form 2A Footer</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contact information and the "Prepared By" block required at the bottom of every SRS Form 2A submission</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Contact Person" required>
                  <Input name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="Full name" />
                </Field>
                <Field label="Designation / Position">
                  <Input name="designation" value={form.designation} onChange={handleChange} placeholder="e.g. HR Manager" />
                </Field>
                <Field label="Contact Phone" required>
                  <Input name="contactPhone" value={form.contactPhone} onChange={handleChange} placeholder="+63 900 000 0000" />
                </Field>
              </div>

              <div className="mt-2 p-4 rounded-xl border border-amber-100 bg-amber-50 space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">SRS Form 2A — Prepared By</p>
                <p className="text-xs text-amber-600">
                  These fields populate the footer of your SRS Form 2A job vacancy submissions. They can be different from the contact person above.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Prepared By (Full Name)">
                    <Input name="srsPreparedBy" value={form.srsPreparedBy} onChange={handleChange} placeholder="Name of the person who prepares the form" />
                  </Field>
                  <Field label="Designation">
                    <Input name="srsPreparedDesignation" value={form.srsPreparedDesignation} onChange={handleChange} placeholder="e.g. HR Officer" />
                  </Field>
                  <Field label="Date Accomplished" hint="SRS Form 2A footer field">
                    <Input name="srsPreparedDate" type="date" value={form.srsPreparedDate} onChange={handleChange} />
                  </Field>
                  <Field label="Contact Number" hint="SRS Form 2A footer field">
                    <Input name="srsPreparedContact" value={form.srsPreparedContact} onChange={handleChange} placeholder="+63 900 000 0000" />
                  </Field>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setActiveTab("location")}>← Back</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}

          {/* ─── TAB 4: Documents ─── */}
          {activeTab === "docs" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Supporting Documents</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload scanned copies of your establishment documents for PESO verification.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "SRS Form 2 (Signed)",        hint: "Signed physical copy of SRS Form 2" },
                  { label: "Business Permit",             hint: "Current year business permit from LGU" },
                  { label: "BIR Form 2303 (COR)",         hint: "Certificate of Registration from BIR" },
                  { label: "DOLE Certification",          hint: "DOLE establishment registration (if applicable)" },
                  { label: "Company Profile / Brochure",  hint: "Optional but recommended for verification" },
                ].map(({ label, hint }) => (
                  <div key={label} className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-slate-400 transition-colors">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{hint}</p>
                    <Button variant="outline" size="sm" type="button">Upload PDF / Image</Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setActiveTab("contact")}>← Back</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
