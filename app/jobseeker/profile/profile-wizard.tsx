"use client";

import { FormEvent, useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Camera, CheckCircle2, Loader2, Save, Plus, Trash2, GraduationCap, Briefcase, Languages, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface JobseekerProfileWizardRef {
  saveCurrentTab: () => Promise<void>;
}

const JobseekerProfileWizard = forwardRef<JobseekerProfileWizardRef, {
  initialProfile: Record<string, any>;
  initialResume: {
    education: any[];
    experience: any[];
    trainings: any[];
    languages: any[];
    licenses: any[];
  };
  onSaveProfile: (payload: Record<string, any>) => Promise<void>;
  onSaveResume: (payload: Record<string, any>) => Promise<void>;
}>(({
  initialProfile,
  initialResume,
  onSaveProfile,
  onSaveResume,
}, ref) => {
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState({
    firstName: initialProfile.first_name || "",
    lastName: initialProfile.last_name || "",
    middleName: initialProfile.middle_name || "",
    suffix: initialProfile.suffix || "",
    phone: initialProfile.phone || "",
    birthDate: initialProfile.birth_date ? initialProfile.birth_date.split('T')[0] : "",
    gender: initialProfile.gender || "",
    religion: initialProfile.religion || "",
    civilStatus: initialProfile.civil_status || "",
    tin: initialProfile.tin || "",
    height: initialProfile.height || "",

    // Disability
    isPwd: initialProfile.is_pwd || false,
    disabilityVisual: initialProfile.disability_visual || false,
    disabilitySpeech: initialProfile.disability_speech || false,
    disabilityMental: initialProfile.disability_mental || false,
    disabilityHearing: initialProfile.disability_hearing || false,
    disabilityPhysical: initialProfile.disability_physical || false,
    disabilityOthers: initialProfile.disability_others || "",

    houseNumber: initialProfile.house_number || "",
    barangay: initialProfile.barangay || "",
    city: initialProfile.city || "",
    province: initialProfile.province || "",
    zipCode: initialProfile.zip_code || "",

    employmentStatus: initialProfile.employment_status || "",
    employmentType: initialProfile.employment_type || "",
    selfEmployedType: initialProfile.self_employed_type || "",
    selfEmployedTypeOthers: initialProfile.self_employed_type_others || "",
    unemployedReason: initialProfile.unemployed_reason || "",
    unemployedMonths: initialProfile.unemployed_months || 0,
    unemployedDueToCalamity: initialProfile.unemployed_due_to_calamity || false,
    terminatedCountry: initialProfile.terminated_country || "",
    terminatedReason: initialProfile.terminated_reason || "",

    isOfw: initialProfile.is_ofw || false,
    ofwCountry: initialProfile.ofw_country || "",
    isFormerOfw: initialProfile.is_former_ofw || false,
    formerOfwCountry: initialProfile.former_ofw_country || "",
    formerOfwReturnMonthYear: initialProfile.former_ofw_return_month_year || "",

    isFourPs: initialProfile.is_four_ps || false,
    householdIdNo: initialProfile.household_id_no || "",

    preferencePartTime: initialProfile.preference_part_time || false,
    preferenceFullTime: initialProfile.preference_full_time || false,
    preferredOccupation1: initialProfile.preferred_occupation_1 || "",
    preferredOccupation2: initialProfile.preferred_occupation_2 || "",
    preferredOccupation3: initialProfile.preferred_occupation_3 || "",

    preferredWorkLocationLocal1: initialProfile.preferred_work_location_local_1 || "",
    preferredWorkLocationLocal2: initialProfile.preferred_work_location_local_2 || "",
    preferredWorkLocationLocal3: initialProfile.preferred_work_location_local_3 || "",
    preferredWorkLocationOverseas1: initialProfile.preferred_work_location_overseas_1 || "",
    preferredWorkLocationOverseas2: initialProfile.preferred_work_location_overseas_2 || "",
    preferredWorkLocationOverseas3: initialProfile.preferred_work_location_overseas_3 || "",

    otherSkills: initialProfile.other_skills || [],
    otherSkillsOthers: initialProfile.other_skills?.filter((s: string) => s !== "Others").join(", ") || "",
  });

  const [resume, setResume] = useState(initialResume);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  useImperativeHandle(ref, () => ({
    saveCurrentTab: async () => {
      setShowValidationErrors(true);
      if (formRef.current && !formRef.current.reportValidity()) {
        return; // Validation failed, do not save
      }

      setSaving(true);
      if (["personal", "address", "employment", "jobPreference", "skills"].includes(activeTab)) {
        await onSaveProfile(form);
      } else {
        await onSaveResume(resume);
      }
      setSaving(false);
    }
  }), [form, resume, activeTab, onSaveProfile, onSaveResume]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveProfile(form);
    setSaving(false);
  };

  const handleSubmitResume = async () => {
    setSaving(true);
    await onSaveResume(resume);
    setSaving(false);
  };

  // Education Helpers
  const addEducation = () => {
    setResume(prev => ({
      ...prev,
      education: [...prev.education, { level: "", course: "", year_graduated: "", level_reached: "", year_last_attended: "" }]
    }));
  };

  const removeEducation = (index: number) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const newEdu = [...resume.education];
    newEdu[index][field] = value;
    setResume(prev => ({ ...prev, education: newEdu }));
  };

  // Experience Helpers
  const addExperience = () => {
    setResume(prev => ({
      ...prev,
      experience: [...prev.experience, { company_name: "", position: "", number_of_months: 0, status: "" }]
    }));
  };

  const removeExperience = (index: number) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index: number, field: string, value: string | number) => {
    const newExp = [...resume.experience];
    newExp[index][field] = value;
    setResume(prev => ({ ...prev, experience: newExp }));
  };

  // Language Helpers
  const addLanguage = () => {
    setResume(prev => ({
      ...prev,
      languages: [...prev.languages, { language: "", read: false, write: false, speak: false, understand: false }]
    }));
  };

  const removeLanguage = (index: number) => {
    setResume(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const updateLanguage = (index: number, field: string, value: boolean | string) => {
    const newLang = [...resume.languages];
    newLang[index][field] = value;
    setResume(prev => ({ ...prev, languages: newLang }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
      <Card className="p-4 h-fit sticky top-6">
        <nav className="flex flex-col gap-2">
          <Button variant={activeTab === "personal" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("personal")}>
            Personal Info
          </Button>
          <Button variant={activeTab === "address" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("address")}>
            Address
          </Button>
          <Button variant={activeTab === "employment" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("employment")}>
            Employment
          </Button>
          <div className="my-2 border-t" />
          <Button variant={activeTab === "education" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("education")}>
            <GraduationCap className="mr-2 h-4 w-4" /> Education
          </Button>
          <Button variant={activeTab === "experience" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("experience")}>
            <Briefcase className="mr-2 h-4 w-4" /> Experience
          </Button>
          <Button variant={activeTab === "languages" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("languages")}>
            <Languages className="mr-2 h-4 w-4" /> Languages
          </Button>
          <Button variant={activeTab === "jobPreference" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("jobPreference")}>
            <Briefcase className="mr-2 h-4 w-4" /> Job Preference
          </Button>
          <Button variant={activeTab === "skills" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("skills")}>
            <Award className="mr-2 h-4 w-4" /> Other Skills
          </Button>
          <div className="my-2 border-t" />
          <Button variant={activeTab === "training" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("training")}>
            <GraduationCap className="mr-2 h-4 w-4" /> Training
          </Button>
          <Button variant={activeTab === "license" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTab("license")}>
            <Award className="mr-2 h-4 w-4" /> License
          </Button>
        </nav>
      </Card>

      <div className="space-y-6">
        {activeTab === "personal" && (
          <Card className="p-6">
            <form ref={formRef} onSubmit={handleSubmitProfile} className={`space-y-6 ${showValidationErrors ? 'was-validated' : ''}`}>
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Middle Name</label>
                  <input name="middleName" value={form.middleName} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Suffix</label>
                  <input name="suffix" value={form.suffix} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Phone <span className="text-red-500">*</span></label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Birth Date <span className="text-red-500">*</span></label>
                  <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Gender <span className="text-red-500">*</span></label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Religion <span className="text-red-500">*</span></label>
                  <input name="religion" value={form.religion} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Civil Status <span className="text-red-500">*</span></label>
                  <select name="civilStatus" value={form.civilStatus} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">TIN <span className="text-red-500">*</span></label>
                  <input name="tin" value={form.tin} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 123-456-789" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Height (cm)</label>
                  <input name="height" value={form.height} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 170" />
                </div>
              </div>

              {/* Disability Section - NSRP Form I */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Disability (PWD)</h4>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="isPwd" checked={form.isPwd} onChange={(e) => setForm(prev => ({ ...prev, isPwd: e.target.checked }))} />
                    <span className="font-medium">I am a Person with Disability (PWD)</span>
                  </label>
                </div>
                {form.isPwd && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-4 border-l-2 border-slate-300">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.disabilityVisual} onChange={(e) => setForm(prev => ({ ...prev, disabilityVisual: e.target.checked }))} />
                      <span>Visual</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.disabilityHearing} onChange={(e) => setForm(prev => ({ ...prev, disabilityHearing: e.target.checked }))} />
                      <span>Hearing</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.disabilitySpeech} onChange={(e) => setForm(prev => ({ ...prev, disabilitySpeech: e.target.checked }))} />
                      <span>Speech</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.disabilityPhysical} onChange={(e) => setForm(prev => ({ ...prev, disabilityPhysical: e.target.checked }))} />
                      <span>Physical</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.disabilityMental} onChange={(e) => setForm(prev => ({ ...prev, disabilityMental: e.target.checked }))} />
                      <span>Mental</span>
                    </label>
                    <div className="col-span-2 md:col-span-3">
                      <label className="text-sm text-slate-600">Others (specify)</label>
                      <input name="disabilityOthers" value={form.disabilityOthers} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Specify other disability" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </form>
          </Card>
        )}

        {activeTab === "address" && (
          <Card className="p-6">
            <form ref={formRef} onSubmit={handleSubmitProfile} className={`space-y-6 ${showValidationErrors ? 'was-validated' : ''}`}>
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">House No. / Street</label>
                  <input name="houseNumber" value={form.houseNumber} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Barangay <span className="text-red-500">*</span></label>
                  <input name="barangay" value={form.barangay} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">City / Municipality <span className="text-red-500">*</span></label>
                  <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Province <span className="text-red-500">*</span></label>
                  <input name="province" value={form.province} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">ZIP Code</label>
                  <input name="zipCode" value={form.zipCode} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </form>
          </Card>
        )}

        {activeTab === "employment" && (
          <Card className="p-6">
            <form ref={formRef} onSubmit={handleSubmitProfile} className={`space-y-6 ${showValidationErrors ? 'was-validated' : ''}`}>
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Employment Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Current Status <span className="text-red-500">*</span></label>
                  <select name="employmentStatus" value={form.employmentStatus} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select Status</option>
                    <option value="Employed">Employed</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Student">Student</option>
                    <option value="Self-Employed">Self-Employed</option>
                  </select>
                </div>
                {form.employmentStatus === "Employed" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Employment Type</label>
                    <select name="employmentType" value={form.employmentType} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                      <option value="">Select Type</option>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                )}
                {form.employmentStatus === "Self-Employed" && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Type of Self-Employed Activity</label>
                    <select name="selfEmployedType" value={form.selfEmployedType} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                      <option value="">Select Type</option>
                      <option value="Farmer">Farmer</option>
                      <option value="Fisherfolk">Fisherfolk</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Driver">Driver</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Informal Worker">Informal Worker</option>
                      <option value="Business Owner">Business Owner</option>
                      <option value="Others">Others (specify)</option>
                    </select>
                    {form.selfEmployedType === "Others" && (
                      <input name="selfEmployedTypeOthers" value={form.selfEmployedTypeOthers} onChange={handleChange} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Specify" />
                    )}
                  </div>
                )}
                {form.employmentStatus === "Unemployed" && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Reason for Unemployment</label>
                      <select name="unemployedReason" value={form.unemployedReason} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                        <option value="">Select Reason</option>
                        <option value="Lost job/ terminated">Lost job/ Terminated</option>
                        <option value="End of contract">End of contract</option>
                        <option value="Resigned">Resigned</option>
                        <option value="Laid off">Laid off</option>
                        <option value="Due to calamity">Due to calamity</option>
                        <option value="Cannot find work">Cannot find work</option>
                        <option value="No work compatibility">No work compatibility</option>
                        <option value="New graduate">New graduate</option>
                        <option value="Illness">Illness</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    {(form.unemployedReason === "Lost job/ terminated" || form.unemployedReason === "Laid off" || form.unemployedReason === "Due to calamity") && (
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.unemployedDueToCalamity} onChange={(e) => setForm(prev => ({ ...prev, unemployedDueToCalamity: e.target.checked }))} />
                          <span>Terminated/Laid off due to calamity</span>
                        </label>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Months Unemployed</label>
                      <input type="number" name="unemployedMonths" value={form.unemployedMonths} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" />
                    </div>
                  </>
                )}
              </div>

              {/* OFW Section - NSRP Form I */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Overseas Filipino Worker (OFW)</h4>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isOfw} onChange={(e) => setForm(prev => ({ ...prev, isOfw: e.target.checked }))} />
                    <span className="font-medium">I am currently an OFW</span>
                  </label>
                </div>
                {form.isOfw && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-slate-300">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Country of Employment</label>
                      <input name="ofwCountry" value={form.ofwCountry} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Saudi Arabia" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isFormerOfw} onChange={(e) => setForm(prev => ({ ...prev, isFormerOfw: e.target.checked }))} />
                    <span className="font-medium">I am a Former OFW</span>
                  </label>
                </div>
                {form.isFormerOfw && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-slate-300 mt-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Country of Last Employment</label>
                      <input name="formerOfwCountry" value={form.formerOfwCountry} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. UAE" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Date of Return (Month Year)</label>
                      <input name="formerOfwReturnMonthYear" value={form.formerOfwReturnMonthYear} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 01/2024" />
                    </div>
                  </div>
                )}
              </div>

              {/* 4Ps Section - NSRP Form I */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">4Ps Beneficiary</h4>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isFourPs} onChange={(e) => setForm(prev => ({ ...prev, isFourPs: e.target.checked }))} />
                    <span className="font-medium">I am a 4Ps beneficiary</span>
                  </label>
                </div>
                {form.isFourPs && (
                  <div className="pl-4 border-l-2 border-slate-300 mt-2">
                    <div className="max-w-xs">
                      <label className="text-sm font-medium text-slate-700">Household ID No.</label>
                      <input name="householdIdNo" value={form.householdIdNo} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 1234-5678-9000" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </form>
          </Card>
        )}

        {activeTab === "education" && (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-900">Education History</h3>
                <Button variant="outline" size="sm" onClick={addEducation}>
                  <Plus className="mr-2 h-4 w-4" /> Add Education
                </Button>
              </div>

              <div className="space-y-4">
                {resume.education.map((edu, index) => (
                  <Card key={index} className="p-4 border-slate-200 bg-slate-50 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removeEducation(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Level</label>
                        <select value={edu.level} onChange={(e) => updateEducation(index, "level", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                          <option value="">Select Level</option>
                          <option value="Elementary">Elementary</option>
                          <option value="High School">High School</option>
                          <option value="Vocational">Vocational</option>
                          <option value="College">College</option>
                          <option value="Graduate">Graduate</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Course / Degree</label>
                        <input value={edu.course} onChange={(e) => updateEducation(index, "course", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. BS Computer Science" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Year Graduated</label>
                        <input value={edu.year_graduated} onChange={(e) => updateEducation(index, "year_graduated", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 2020" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </div>
          </Card>
        )}

        {activeTab === "experience" && (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-900">Work Experience</h3>
                <Button variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="mr-2 h-4 w-4" /> Add Experience
                </Button>
              </div>

              <div className="space-y-4">
                {resume.experience.map((exp, index) => (
                  <Card key={index} className="p-4 border-slate-200 bg-slate-50 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removeExperience(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Company Name</label>
                        <input value={exp.company_name} onChange={(e) => updateExperience(index, "company_name", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Position</label>
                        <input value={exp.position} onChange={(e) => updateExperience(index, "position", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Duration (Months)</label>
                        <input type="number" value={exp.number_of_months} onChange={(e) => updateExperience(index, "number_of_months", parseInt(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </div>
          </Card>
        )}

        {activeTab === "languages" && (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-900">Languages</h3>
                <Button variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="mr-2 h-4 w-4" /> Add Language
                </Button>
              </div>

              <div className="space-y-4">
                {resume.languages.map((lang, index) => (
                  <Card key={index} className="p-4 border-slate-200 bg-slate-50 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => removeLanguage(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Language</label>
                        <input value={lang.language} onChange={(e) => updateLanguage(index, "language", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. English, Tagalog" />
                      </div>
                      <div className="flex flex-wrap gap-4 pt-6">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={lang.read} onChange={(e) => updateLanguage(index, "read", e.target.checked)} /> Read
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={lang.write} onChange={(e) => updateLanguage(index, "write", e.target.checked)} /> Write
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={lang.speak} onChange={(e) => updateLanguage(index, "speak", e.target.checked)} /> Speak
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={lang.understand} onChange={(e) => updateLanguage(index, "understand", e.target.checked)} /> Understand
                        </label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </div>
          </Card>
        )}

        {activeTab === "jobPreference" && (
          <Card className="p-6">
            <form ref={formRef} onSubmit={handleSubmitProfile} className={`space-y-6 ${showValidationErrors ? 'was-validated' : ''}`}>
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Job Preference</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Preferred Occupation 1 <span className="text-red-500">*</span></label>
                  <input name="preferredOccupation1" value={form.preferredOccupation1} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Software Developer" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Preferred Occupation 2</label>
                  <input name="preferredOccupation2" value={form.preferredOccupation2} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Web Developer" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Preferred Occupation 3</label>
                  <input name="preferredOccupation3" value={form.preferredOccupation3} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Database Admin" />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Work Type Preference</h4>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.preferenceFullTime} onChange={(e) => setForm(prev => ({ ...prev, preferenceFullTime: e.target.checked }))} />
                    <span>Full-Time</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.preferencePartTime} onChange={(e) => setForm(prev => ({ ...prev, preferencePartTime: e.target.checked }))} />
                    <span>Part-Time</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Preferred Work Location (Local)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location 1 <span className="text-red-500">*</span></label>
                    <input name="preferredWorkLocationLocal1" value={form.preferredWorkLocationLocal1} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Davao City" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location 2</label>
                    <input name="preferredWorkLocationLocal2" value={form.preferredWorkLocationLocal2} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location 3</label>
                    <input name="preferredWorkLocationLocal3" value={form.preferredWorkLocationLocal3} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Preferred Work Location (Overseas)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location 1</label>
                    <input name="preferredWorkLocationOverseas1" value={form.preferredWorkLocationOverseas1} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Saudi Arabia" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location 2</label>
                    <input name="preferredWorkLocationOverseas2" value={form.preferredWorkLocationOverseas2} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location 3</label>
                    <input name="preferredWorkLocationOverseas3" value={form.preferredWorkLocationOverseas3} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </form>
          </Card>
        )}

        {activeTab === "skills" && (
          <Card className="p-6">
            <form ref={formRef} onSubmit={handleSubmitProfile} className={`space-y-6 ${showValidationErrors ? 'was-validated' : ''}`}>
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Other Skills (NSRP Section VIII)</h3>
              <p className="text-sm text-slate-600">Check all that apply:</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {["Auto Mechanic", "Beautician", "Carpentry Work", "Computer Literate", "Domestic Chores", "Driver", "Electrician", "Embroidery", "Gardening", "Masonry", "Painter/Artist", "Painting Jobs", "Photography", "Plumbing", "Sewing Dresses", "Stenography", "Tailoring", "Others"].map((skill) => (
                  <label key={skill} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.otherSkills.includes(skill)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSkills = skill === "Others"
                            ? [...form.otherSkills, "Others"]
                            : [...form.otherSkills, skill];
                          setForm(prev => ({
                            ...prev,
                            otherSkills: newSkills,
                            otherSkillsOthers: skill === "Others" ? "" : prev.otherSkillsOthers
                          }));
                        } else {
                          setForm(prev => ({
                            ...prev,
                            otherSkills: prev.otherSkills.filter((s: string) => s !== skill),
                            otherSkillsOthers: skill === "Others" ? "" : prev.otherSkillsOthers
                          }));
                        }
                      }}
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>

              {form.otherSkills.includes("Others") && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-slate-700">Specify other skills</label>
                  <input
                    value={form.otherSkillsOthers}
                    onChange={(e) => {
                      setForm(prev => ({
                        ...prev,
                        otherSkillsOthers: e.target.value,
                        otherSkills: e.target.value
                          ? [...prev.otherSkills.filter((s: string) => s !== "Others"), "Others"]
                          : prev.otherSkills.filter((s: string) => s !== "Others")
                      }));
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="List other skills"
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </form>
          </Card>
        )}

        {activeTab === "training" && (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-900">Technical/Vocational Training</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  setResume(prev => ({
                    ...prev,
                    trainings: [...prev.trainings, { training_title: "", institutation: "", duration: "", year_completed: "" }]
                  }));
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Training
                </Button>
              </div>

              <div className="space-y-4">
                {resume.trainings.map((train, index) => (
                  <Card key={index} className="p-4 border-slate-200 bg-slate-50 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => {
                      setResume(prev => ({
                        ...prev,
                        trainings: prev.trainings.filter((_, i) => i !== index)
                      }));
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Training Title</label>
                        <input value={train.training_title} onChange={(e) => {
                          const newTrain = [...resume.trainings];
                          newTrain[index].training_title = e.target.value;
                          setResume(prev => ({ ...prev, trainings: newTrain }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Computer Repair" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Institution</label>
                        <input value={train.institutation} onChange={(e) => {
                          const newTrain = [...resume.trainings];
                          newTrain[index].institutation = e.target.value;
                          setResume(prev => ({ ...prev, trainings: newTrain }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. TESDA" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Duration</label>
                        <input value={train.duration} onChange={(e) => {
                          const newTrain = [...resume.trainings];
                          newTrain[index].duration = e.target.value;
                          setResume(prev => ({ ...prev, trainings: newTrain }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 6 months" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Year Completed</label>
                        <input value={train.year_completed} onChange={(e) => {
                          const newTrain = [...resume.trainings];
                          newTrain[index].year_completed = e.target.value;
                          setResume(prev => ({ ...prev, trainings: newTrain }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. 2023" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </div>
          </Card>
        )}

        {activeTab === "license" && (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-900">Eligibility / Professional License</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  setResume(prev => ({
                    ...prev,
                    licenses: [...prev.licenses, { title: "", license_number: "", date_valid: "", date_expiry: "", image_url: "" }]
                  }));
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add License
                </Button>
              </div>

              <div className="space-y-4">
                {resume.licenses.map((lic, index) => (
                  <Card key={index} className="p-4 border-slate-200 bg-slate-50 relative">
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => {
                      setResume(prev => ({
                        ...prev,
                        licenses: prev.licenses.filter((_, i) => i !== index)
                      }));
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Title / Type</label>
                        <input value={lic.title} onChange={(e) => {
                          const newLic = [...resume.licenses];
                          newLic[index].title = e.target.value;
                          setResume(prev => ({ ...prev, licenses: newLic }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. CPA,-bar, Board Exam" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">License Number</label>
                        <input value={lic.license_number} onChange={(e) => {
                          const newLic = [...resume.licenses];
                          newLic[index].license_number = e.target.value;
                          setResume(prev => ({ ...prev, licenses: newLic }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Date Valid</label>
                        <input type="date" value={lic.date_valid} onChange={(e) => {
                          const newLic = [...resume.licenses];
                          newLic[index].date_valid = e.target.value;
                          setResume(prev => ({ ...prev, licenses: newLic }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Date Expiry</label>
                        <input type="date" value={lic.date_expiry} onChange={(e) => {
                          const newLic = [...resume.licenses];
                          newLic[index].date_expiry = e.target.value;
                          setResume(prev => ({ ...prev, licenses: newLic }));
                        }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">License Photo (Optional)</label>
                        {lic.image_url ? (
                          <div className="flex items-center gap-4">
                            <img src={lic.image_url} alt="License" className="h-20 w-32 object-cover rounded border border-slate-300" />
                            <Button variant="outline" size="sm" onClick={() => {
                              const newLic = [...resume.licenses];
                              newLic[index].image_url = "";
                              setResume(prev => ({ ...prev, licenses: newLic }));
                            }}>Remove Photo</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className="flex items-center justify-center cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
                              <Camera className="h-4 w-4 mr-2" />
                              Upload Photo
                              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append("file", file);
                                try {
                                  const response = await fetch("/api/upload/license", { method: "POST", body: formData });
                                  const data = await response.json();
                                  if (response.ok && data.url) {
                                    const newLic = [...resume.licenses];
                                    newLic[index].image_url = data.url;
                                    setResume(prev => ({ ...prev, licenses: newLic }));
                                  } else {
                                    alert(data.error || "Failed to upload image");
                                  }
                                } catch {
                                  alert("Failed to upload image");
                                }
                              }} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                {/* Button moved to top bar */}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
});

JobseekerProfileWizard.displayName = "JobseekerProfileWizard";

export default JobseekerProfileWizard;
