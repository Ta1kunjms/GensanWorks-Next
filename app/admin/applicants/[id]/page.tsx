"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Loader2, User, Mail, Phone, MapPin, Briefcase, 
  GraduationCap, Award, Languages, FileText, Globe, Heart, Shield,
  BadgeCheck, Info, CheckCircle2, XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      } catch (err) {
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
          <Button variant="outline" onClick={() => window.print()}>Print Form 1</Button>
        </div>
      </div>

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
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span>Visual</span> {profile.disability_visual ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Speech</span> {profile.disability_speech ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Hearing</span> {profile.disability_hearing ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Physical</span> {profile.disability_physical ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                  </div>
                </div>
              )}
              <InfoItem label="4Ps Member" value={profile.is_four_ps ? "Yes" : "No"} />
              {profile.is_four_ps && <InfoItem label="Household ID" value={profile.household_id_no} />}
            </div>
          </Card>
        </div>

        {/* Center/Right Content: Detailed NSRP Fields */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Section: Personal Info Detail */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <User className="h-5 w-5" />
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
              <InfoItem label="Height" value={profile.height} />
              <InfoItem label="TIN" value={profile.tin} />
            </Card>
          </section>

          {/* Section: Employment Status Detail */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5" />
                <h3 className="text-lg font-bold">II. Employment Status</h3>
              </div>
            </div>
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoItem label="Current Status" value={profile.employment_status} />
                <InfoItem label="Actively Looking?" value={profile.job_seeking_status?.replace('_', ' ')} />
                <InfoItem label="Type" value={[profile.preference_full_time ? "Full-Time" : null, profile.preference_part_time ? "Part-Time" : null].filter(Boolean).join(", ") || "Not Specified"} />
              </div>
              
              {profile.employment_status === "Unemployed" && (
                <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem label="Reason" value={profile.unemployed_reason} />
                  <InfoItem label="Months Unemployed" value={profile.unemployed_months} />
                </div>
              )}
            </Card>
          </section>

          {/* Section: OFW Details */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Globe className="h-5 w-5" />
                <h3 className="text-lg font-bold">III. Overseas Worker (OFW) Information</h3>
              </div>
            </div>
            <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <span className="text-sm font-medium">Currently an OFW?</span>
                  {profile.is_ofw ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-slate-200" />}
                </div>
                {profile.is_ofw && <InfoItem label="Current Country" value={profile.ofw_country} />}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <span className="text-sm font-medium">Former OFW?</span>
                  {profile.is_former_ofw ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-slate-200" />}
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

          {/* Section: Job Preferences */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Shield className="h-5 w-5" />
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
                  <ul className="text-sm space-y-1 text-slate-700">
                    {[profile.preferred_work_location_local_1, profile.preferred_work_location_local_2, profile.preferred_work_location_local_3].filter(Boolean).map((loc, i) => (
                      <li key={i} className="flex items-center gap-2"><MapPin className="h-3 w-3 text-slate-400" /> {loc}</li>
                    ))}
                    {(!profile.preferred_work_location_local_1) && <li className="italic text-slate-400">No local preferences</li>}
                  </ul>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferred Overseas Locations</p>
                  <ul className="text-sm space-y-1 text-slate-700">
                    {[profile.preferred_work_location_overseas_1, profile.preferred_work_location_overseas_2, profile.preferred_work_location_overseas_3].filter(Boolean).map((loc, i) => (
                      <li key={i} className="flex items-center gap-2"><Globe className="h-3 w-3 text-slate-400" /> {loc}</li>
                    ))}
                    {(!profile.preferred_work_location_overseas_1) && <li className="italic text-slate-400">No overseas preferences</li>}
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          {/* Resume Sections: Education, Experience, etc. */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="h-5 w-5" />
                <h3 className="text-lg font-bold">V. Education & Background</h3>
              </div>
            </div>
            <div className="space-y-4">
              {resume?.education.map((edu, idx) => (
                <Card key={idx} className="p-4 flex justify-between items-center border-l-4 border-l-slate-900">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{edu.level}</p>
                    <p className="font-bold text-slate-900">{edu.school_name || "Unknown School"}</p>
                    <p className="text-sm text-slate-600">{edu.course || "No Course/Degree Specified"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{edu.year_graduated || "N/A"}</p>
                    {edu.currently_in_school && <span className="text-[10px] text-sky-600 font-bold uppercase">Enrolled</span>}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Work History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5" />
                <h3 className="text-lg font-bold">VI. Work History</h3>
              </div>
            </div>
            <div className="space-y-4">
              {resume?.experience.map((exp, idx) => (
                <Card key={idx} className="p-4 border-l-4 border-l-slate-200">
                  <div className="flex justify-between">
                    <p className="font-bold text-slate-900">{exp.position}</p>
                    <span className="text-xs font-bold text-slate-400 uppercase">{exp.status}</span>
                  </div>
                  <p className="text-sm text-slate-600">{exp.company_name}</p>
                  <p className="mt-1 text-xs text-slate-400 font-medium">{formatDuration(exp.number_of_months)}</p>
                </Card>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
