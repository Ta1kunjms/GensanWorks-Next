"use client";

import { FormEvent, useState, useEffect } from "react";
import { Camera, CheckCircle2, Loader2, Save, Plus, Trash2, GraduationCap, Briefcase, Languages, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function JobseekerProfileWizard({
  initialProfile,
  initialResume,
  onSaveProfile,
  onSaveResume,
}: {
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
}) {
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
  });

  const [resume, setResume] = useState(initialResume);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

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
        </nav>
      </Card>

      <div className="space-y-6">
        {activeTab === "personal" && (
          <Card className="p-6">
            <form onSubmit={handleSubmitProfile} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
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
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Birth Date</label>
                  <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-slate-500" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Civil Status</label>
                  <select name="civilStatus" value={form.civilStatus} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>Save Personal Info</Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === "address" && (
          <Card className="p-6">
            <form onSubmit={handleSubmitProfile} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">House No. / Street</label>
                  <input name="houseNumber" value={form.houseNumber} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Barangay</label>
                  <input name="barangay" value={form.barangay} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">City / Municipality</label>
                  <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Province</label>
                  <input name="province" value={form.province} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">ZIP Code</label>
                  <input name="zipCode" value={form.zipCode} onChange={handleChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>Save Address</Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === "employment" && (
          <Card className="p-6">
            <form onSubmit={handleSubmitProfile} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Employment Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Current Status</label>
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
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>Save Status</Button>
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
                <Button onClick={handleSubmitResume} disabled={saving}>Save Education History</Button>
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
                <Button onClick={handleSubmitResume} disabled={saving}>Save Experience</Button>
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
                <Button onClick={handleSubmitResume} disabled={saving}>Save Languages</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
