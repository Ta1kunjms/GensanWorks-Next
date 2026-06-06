"use client";
export const dynamic = "force-dynamic";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Loader2, User, Phone, MapPin, Briefcase, 
  GraduationCap, Award, Languages, FileText, Globe, Heart, Shield,
  BadgeCheck, CheckCircle2, XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

type JobseekerProfile = Record<string, any>;
type ResumeData = {
  education: any[];
  experience: any[];
  trainings: any[];
  languages: any[];
  licenses: any[];
};

export default function AdminViewProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [profile, setProfile] = useState<JobseekerProfile | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/applicants/${id}`, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Unable to load profile");
          return;
        }

        setProfile(data.profile);
        setResume(data.resume);
      } catch {
        setError("An unexpected error occurred while loading the profile.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
        <p className="text-slate-500 font-medium">Loading full NSRP record...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="p-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <FileText className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Profile Not Found</h2>
            <p className="text-slate-500">{error || "The requested job seeker record could not be found."}</p>
          </div>
          <Button onClick={() => router.push("/admin/applicants")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Seekers
          </Button>
        </Card>
      </div>
    );
  }

  const fullName = `${profile.first_name || ""} ${profile.middle_name || ""} ${profile.last_name || ""} ${profile.suffix || ""}`.trim() || "Unnamed Job Seeker";
  const profileImageSrc = profile.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`;

  const InfoItem = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => (
    <div className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-slate-400 mt-0.5" />}
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm text-slate-900 font-medium">{value || "—"}</p>
      </div>
    </div>
  );

  const formatDuration = (totalMonths: number) => {
    if (!totalMonths || totalMonths === 0) return "Less than a month";
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    const yearParts = [];
    if (years > 0) yearParts.push(`${years} year${years > 1 ? "s" : ""}`);
    if (months > 0) yearParts.push(`${months} month${months > 1 ? "s" : ""}`);
    
    return yearParts.join(" and ");
  };

  const handleResetPassword = async () => {
    setPasswordNotice("");

    if (!newPassword.trim()) {
      setPasswordNotice("Enter a temporary password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice("Passwords do not match.");
      return;
    }

    setResettingPassword(true);
    try {
      const response = await fetch(`/api/admin/applicants/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setPasswordNotice(data.error || "Unable to update password.");
        return;
      }

      setPasswordNotice(data.message || "Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setShowResetDialog(false);
    } catch {
      setPasswordNotice("An unexpected error occurred while updating the password.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 sticky top-0 bg-white/80 backdrop-blur-md z-10 pt-4">
        <div className="space-y-1">
          <Button onClick={() => router.push("/admin/applicants")} variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Seekers
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">{fullName}</h1>
          <p className="text-slate-500 flex items-center gap-2">
            NSRP ID: <span className="font-mono font-bold text-slate-900">{profile.nsrp_id}</span>
            {profile.profile_complete && <BadgeCheck className="h-4 w-4 text-emerald-500" />}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>Change password</Button>
          <Button variant="outline" onClick={() => window.print()}>Print Form 1</Button>
        </div>
      </div>

      {passwordNotice ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {passwordNotice}
        </div>
      ) : null}

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change jobseeker password</DialogTitle>
            <DialogDescription>
              Set a temporary password for this jobseeker so they can sign in again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Temporary password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter a new temporary password"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat the temporary password"
              />
            </div>
            <p className="text-xs text-slate-500">
              Use this only as a temporary reset. Share the new password privately with the jobseeker.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resettingPassword}>
              Cancel
            </Button>
            <Button onClick={() => void handleResetPassword()} disabled={resettingPassword}>
              {resettingPassword ? "Updating..." : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Personal Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center space-y-4 relative overflow-hidden bg-slate-900 text-white">
            <div className="mx-auto h-32 w-32 rounded-3xl bg-white/10 overflow-hidden border-4 border-white/20 shadow-xl">
              <img src={profileImageSrc} alt={fullName} className="h-full w-full object-cover" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{fullName}</h2>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/20">
                {profile.employment_status || "Unknown"}
              </span>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Phone className="h-3 w-3" /> Contact Info
            </h3>
            <div className="space-y-1">
              <InfoItem label="Mobile" value={profile.phone} />
              <InfoItem label="Email" value={profile.email} />
              <InfoItem label="Address" value={[profile.house_number, profile.barangay, profile.city, profile.province].filter(Boolean).join(", ")} />
              <InfoItem label="Zip Code" value={profile.zip_code} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Heart className="h-3 w-3" /> Special Status
            </h3>
            <div className="space-y-1">
              <InfoItem label="PWD" value={profile.is_pwd ? "Yes" : "No"} />
              {profile.is_pwd && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2 mt-2 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Visual</span> {profile.disability_visual ? <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Speech</span> {profile.disability_speech ? <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Hearing</span> {profile.disability_hearing ? <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Physical</span> {profile.disability_physical ? <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Mental</span> {profile.disability_mental ? <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  {profile.disability_others && (
                    <div className="pt-1.5 border-t border-slate-200 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Others Specify</p>
                      <p className="text-slate-700 font-medium text-[11px] leading-relaxed">{profile.disability_others}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <InfoItem label="4Ps Member" value={profile.is_four_ps ? "Yes" : "No"} />
                {profile.is_four_ps && <InfoItem label="Household ID" value={profile.household_id_no} />}
              </div>
            </div>
          </Card>
        </div>

        {/* Center/Right Content: Detailed NSRP Fields */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Section I: Personal Info Detail */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <User className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">I. Personal Information</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Form 1 Section 1</span>
            </div>
            <Card className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <InfoItem label="First Name" value={profile.first_name} />
              <InfoItem label="Middle Name" value={profile.middle_name} />
              <InfoItem label="Last Name" value={profile.last_name} />
              <InfoItem label="Suffix" value={profile.suffix} />
              <InfoItem label="Birth Date" value={profile.birth_date ? formatDate(profile.birth_date) : null} />
              <InfoItem label="Gender" value={profile.gender} />
              <InfoItem label="Civil Status" value={profile.civil_status} />
              <InfoItem label="Religion" value={profile.religion} />
              <InfoItem label="Height (cm)" value={profile.height} />
              <InfoItem label="TIN" value={profile.tin} />
            </Card>
          </section>

          {/* Section II: Employment Status Detail */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">II. Employment Status</h3>
              </div>
            </div>
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoItem label="Current Status" value={profile.employment_status} />
                <InfoItem label="Actively Looking?" value={profile.job_seeking_status?.replace('_', ' ')} />
                <InfoItem label="Work Type Preference" value={[profile.preference_full_time ? "Full-Time" : null, profile.preference_part_time ? "Part-Time" : null].filter(Boolean).join(", ") || "Not Specified"} />
              </div>
              
              {profile.employment_status === "Employed" && profile.employment_type && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-355">
                  <InfoItem label="Employment Type" value={profile.employment_type} />
                </div>
              )}

              {profile.employment_status === "Self-Employed" && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-355">
                  <InfoItem label="Self-Employed Activity" value={profile.self_employed_type} />
                  {profile.self_employed_type === "Others" && (
                    <InfoItem label="Specify Activity" value={profile.self_employed_type_others} />
                  )}
                </div>
              )}

              {profile.employment_status === "Unemployed" && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-355">
                  <InfoItem label="Reason for Unemployment" value={profile.unemployed_reason} />
                  <InfoItem label="Months Unemployed" value={profile.unemployed_months} />
                  <InfoItem label="Terminated due to Calamity?" value={profile.unemployed_due_to_calamity ? "Yes" : "No"} />
                  {profile.terminated_country && (
                    <InfoItem label="Terminated Country" value={profile.terminated_country} />
                  )}
                  {profile.terminated_reason && (
                    <InfoItem label="Terminated Reason" value={profile.terminated_reason} />
                  )}
                </div>
              )}
            </Card>
          </section>

          {/* Section III: OFW Details */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Globe className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">III. Overseas Worker (OFW) Information</h3>
              </div>
            </div>
            <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-700">Currently an OFW?</span>
                  {profile.is_ofw ? <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-5 w-5 text-slate-200" />}
                </div>
                {profile.is_ofw && <InfoItem label="Current Country" value={profile.ofw_country} />}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-700">Former OFW?</span>
                  {profile.is_former_ofw ? <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-50" /> : <XCircle className="h-5 w-5 text-slate-200" />}
                </div>
                {profile.is_former_ofw && (
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Former Country" value={profile.former_ofw_country} />
                    <InfoItem label="Return Date" value={profile.former_ofw_return_month_year} />
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Section IV: Job Preferences */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Shield className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">IV. Work Type Preferences</h3>
              </div>
            </div>
            <Card className="p-6 space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferred Occupations</p>
                <div className="flex flex-wrap gap-2">
                  {[profile.preferred_occupation_1, profile.preferred_occupation_2, profile.preferred_occupation_3].filter(Boolean).map((occ, i) => (
                    <span key={i} className="px-4 py-2 bg-slate-100 text-slate-900 text-sm font-medium rounded-xl border border-slate-200">
                      {occ}
                    </span>
                  ))}
                  {(!profile.preferred_occupation_1 && !profile.preferred_occupation_2 && !profile.preferred_occupation_3) && <span className="text-sm text-slate-400 italic">None specified</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferred Local Locations</p>
                  <ul className="text-sm space-y-2 text-slate-700">
                    {[profile.preferred_work_location_local_1, profile.preferred_work_location_local_2, profile.preferred_work_location_local_3].filter(Boolean).map((loc, i) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"><MapPin className="h-4 w-4 text-rose-500" /> {loc}</li>
                    ))}
                    {(!profile.preferred_work_location_local_1) && <li className="italic text-slate-400">No local preferences</li>}
                  </ul>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferred Overseas Locations</p>
                  <ul className="text-sm space-y-2 text-slate-700">
                    {[profile.preferred_work_location_overseas_1, profile.preferred_work_location_overseas_2, profile.preferred_work_location_overseas_3].filter(Boolean).map((loc, i) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"><Globe className="h-4 w-4 text-indigo-500" /> {loc}</li>
                    ))}
                    {(!profile.preferred_work_location_overseas_1) && <li className="italic text-slate-400">No overseas preferences</li>}
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          {/* Section V: Education & Background */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">V. Education & Background</h3>
              </div>
            </div>
            <div className="space-y-4">
              {resume?.education.map((edu, idx) => (
                <Card key={idx} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-slate-900 bg-white shadow-sm hover:shadow transition duration-150">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded border border-slate-200">
                        {edu.level}
                      </span>
                      {edu.currently_in_school && (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold uppercase rounded border border-sky-200">
                          Currently Enrolled
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-base">{edu.school_name || "Unknown School"}</p>
                    <p className="text-sm text-slate-600 font-medium">{edu.course || "No Course/Degree Specified"}</p>
                    
                    {/* Level reached for incomplete program */}
                    {edu.level_reached && (
                      <p className="text-xs text-slate-500">
                        Level Reached: <span className="font-semibold text-slate-700">{edu.level_reached}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-left md:text-right shrink-0">
                    {edu.year_graduated ? (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Graduated</p>
                        <p className="text-sm font-bold text-slate-900">{edu.year_graduated}</p>
                      </div>
                    ) : (
                      edu.year_last_attended && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last Attended</p>
                          <p className="text-sm font-bold text-slate-900">{edu.year_last_attended}</p>
                        </div>
                      )
                    )}
                  </div>
                </Card>
              ))}
              {(!resume?.education || resume.education.length === 0) && (
                <Card className="p-6 text-center text-slate-400 italic bg-white border border-slate-200 rounded-xl">No education records provided</Card>
              )}
            </div>
          </section>

          {/* Section VI: Work History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">VI. Work History</h3>
              </div>
            </div>
            <div className="space-y-4">
              {resume?.experience.map((exp, idx) => (
                <Card key={idx} className="p-5 border-l-4 border-l-slate-400 bg-white shadow-sm hover:shadow transition duration-150">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-bold text-slate-900 text-base">{exp.position}</p>
                      <p className="text-sm text-indigo-600 font-semibold">{exp.company_name}</p>
                      {exp.address && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-slate-400" /> {exp.address}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200 shrink-0">
                      {exp.status || "Unknown"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400 font-medium">Duration: {formatDuration(exp.number_of_months)}</p>
                </Card>
              ))}
              {(!resume?.experience || resume.experience.length === 0) && (
                <Card className="p-6 text-center text-slate-400 italic bg-white border border-slate-200 rounded-xl">No work experience records provided</Card>
              )}
            </div>
          </section>

          {/* Section VII: Languages */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Languages className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">VII. Languages</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resume?.languages.map((lang, idx) => (
                <Card key={idx} className="p-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition duration-200 rounded-xl">
                  <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <p className="font-bold text-slate-950 text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-400" /> {lang.language}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'read', label: 'Read' },
                      { key: 'write', label: 'Write' },
                      { key: 'speak', label: 'Speak' },
                      { key: 'understand', label: 'Understand' }
                    ].map(({ key, label }) => {
                      const isCapable = lang[key] === true;
                      return (
                        <div 
                          key={key} 
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition duration-150 ${
                            isCapable 
                              ? 'bg-emerald-50/40 border-emerald-100 text-emerald-700' 
                              : 'bg-slate-50/50 border-slate-100 text-slate-400'
                          }`}
                        >
                          {isCapable ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mb-1 fill-emerald-50" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-300 mb-1" />
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
              {(!resume?.languages || resume.languages.length === 0) && (
                <div className="md:col-span-2">
                  <Card className="p-6 text-center text-slate-400 italic bg-white border border-slate-200 rounded-xl">No language records provided</Card>
                </div>
              )}
            </div>
          </section>

          {/* Section VIII: Other Skills */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Award className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">VIII. Other Skills (NSRP Section VIII)</h3>
              </div>
            </div>
            <Card className="p-6 space-y-4 bg-white border border-slate-200 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Skills Checked</p>
                <div className="flex flex-wrap gap-2.5">
                  {Array.isArray(profile.other_skills) && profile.other_skills.filter(Boolean).map((skill, i) => (
                    <span key={i} className="px-3.5 py-1.5 bg-indigo-50 text-indigo-705 text-sm font-semibold rounded-xl border border-indigo-100 flex items-center gap-1.5 shadow-sm hover:scale-102 transition duration-150">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 fill-indigo-50" /> {skill}
                    </span>
                  ))}
                  {(!profile.other_skills || !Array.isArray(profile.other_skills) || profile.other_skills.length === 0) && (
                    <span className="text-sm text-slate-400 italic">No skills checked</span>
                  )}
                </div>
              </div>

              {profile.other_skills_others && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Other Custom Skills</p>
                  <p className="text-sm text-slate-800 font-medium bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    {profile.other_skills_others}
                  </p>
                </div>
              )}
            </Card>
          </section>

          {/* Section IX: Technical/Vocational Training */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">IX. Technical/Vocational Training</h3>
              </div>
            </div>
            <div className="space-y-4">
              {resume?.trainings.map((train, idx) => {
                const title = train.course || train.training_title || "Unknown Training Course";
                const institution = train.training_institution || train.institution || "Unknown Institution";
                const duration = train.hours_of_training ? `${train.hours_of_training} hours` : (train.duration || "N/A");
                
                return (
                  <Card key={idx} className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow transition duration-150">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 pb-4 border-b border-slate-50">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{title}</h4>
                        <p className="text-sm text-indigo-500 font-semibold mt-0.5">{institution}</p>
                      </div>
                      <span className="px-3 py-1 bg-slate-50 text-slate-700 text-xs font-bold uppercase rounded-full border border-slate-200 shrink-0">
                        {duration}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {train.skills_acquired && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skills Acquired</p>
                          <p className="text-sm text-slate-800 font-semibold">{train.skills_acquired}</p>
                        </div>
                      )}
                      {train.certificates_received && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certificates Received</p>
                          <p className="text-sm text-slate-800 font-semibold">{train.certificates_received}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
              {(!resume?.trainings || resume.trainings.length === 0) && (
                <Card className="p-6 text-center text-slate-400 italic bg-white border border-slate-200 rounded-xl">No technical/vocational training records provided</Card>
              )}
            </div>
          </section>

          {/* Section X: Eligibility & Professional License */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Award className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold">X. Eligibility / Professional License</h3>
              </div>
            </div>
            <div className="space-y-4">
              {resume?.licenses.map((lic, idx) => {
                const title = lic.eligibility || lic.professional_license || lic.title || "Professional License";
                const licenseNumber = lic.license_number || "—";
                const dateTaken = lic.date_taken || lic.date_valid ? formatDate(lic.date_taken || lic.date_valid) : "—";
                const dateExpiry = lic.valid_until || lic.date_expiry ? formatDate(lic.valid_until || lic.date_expiry) : "—";
                
                return (
                  <Card key={idx} className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow transition duration-150">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <h4 className="font-bold text-slate-900 text-lg">{title}</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <InfoItem label="License Number" value={licenseNumber} />
                          <InfoItem label="Date Taken / Valid" value={dateTaken} />
                          <InfoItem label="Expiry Date" value={dateExpiry} />
                        </div>
                      </div>

                      {lic.image_url && (
                        <div className="w-full md:w-48 shrink-0 flex flex-col items-center gap-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center self-start">License Document</p>
                          <a 
                            href={lic.image_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="group block relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-md transition duration-200"
                          >
                            <img src={lic.image_url} alt="License document" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition duration-200">
                              <Globe className="h-4 w-4" /> View Large
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
              {(!resume?.licenses || resume.licenses.length === 0) && (
                <Card className="p-6 text-center text-slate-400 italic bg-white border border-slate-200 rounded-xl">No licenses or eligibility records provided</Card>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
