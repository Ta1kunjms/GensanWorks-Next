"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Briefcase, GraduationCap, Star, Phone, Mail, MessageSquare,
  FileText, Award, Globe, Heart, AlertCircle, ChevronLeft, Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-client";

type NSRPProfile = {
  userId: string;
  nsrpId?: string;
  name: string;
  email: string;
  age?: number;
  sex?: string;
  address?: string;
  city?: string;
  contactNumber?: string;
  jobSeekingStatus: string;
  educationLevel?: string;
  yearsExperience?: number;
  skills: string[];
  languages?: string[];
  workSetupPreference?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  preferredWorkLocation?: string;
  certifications?: { name: string; issuer: string; year?: number }[];
  workExperience?: { company: string; position: string; startDate: string; endDate?: string; description?: string }[];
  education?: { school: string; degree: string; yearGraduated?: number }[];
  pwdStatus?: boolean;
  disabilityType?: string;
  profilePhoto?: string;
};

export default function PublicNSRPProfilePage() {
  const params = useParams<{ nsrp_id: string }>();
  const nsrpId = params?.nsrp_id;
  const router = useRouter();
  const { data: session } = useAuth();
  const viewerRole = (session?.user as { role?: string } | undefined)?.role ?? null;
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const [profile, setProfile] = useState<NSRPProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!nsrpId) return;
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/public/profile/${nsrpId}`);
      if (res.ok) {
        const data = await res.json() as NSRPProfile;
        setProfile(data);
      } else {
        setError("Profile not found or access denied.");
      }
      setLoading(false);
    })();
  }, [nsrpId]);

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      actively_looking: { label: "🟢 Actively Looking", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
      open: { label: "🟡 Open to Opportunities", cls: "bg-amber-100 text-amber-700 border-amber-300" },
      not_looking: { label: "🔴 Not Currently Looking", cls: "bg-slate-100 text-slate-600 border-slate-300" },
    }[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
    return <Badge className={`${config.cls} border font-medium`}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-8">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <Card className="p-12">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">{error || "Profile not found."}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 animate-in fade-in duration-500">
      {/* Nav */}
      <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600" onClick={() => router.back()}>
        <ChevronLeft className="w-4 h-4" /> Back
      </Button>

      {/* Hero card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-black text-purple-600">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                profile.name?.charAt(0)?.toUpperCase()
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              {viewerRole === "employer" && (
                <Link href={`/employer/messages?peerId=${profile.userId}`}>
                  <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                    <MessageSquare className="w-4 h-4" /> Message Applicant
                  </Button>
                </Link>
              )}
              {viewerRole === "admin" && (
                <>
                  <Link href={`/admin/messages?peerId=${profile.userId}`}>
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="w-4 h-4" /> Message
                    </Button>
                  </Link>
                  <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                    <FileText className="w-4 h-4" /> Generate Referral Slip
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900">{profile.name}</h1>
              <StatusBadge status={profile.jobSeekingStatus} />
              {profile.nsrpId && (
                <Badge variant="outline" className="text-xs">NSRP: {profile.nsrpId}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              {profile.city && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{profile.city}</span>
              )}
              {profile.educationLevel && (
                <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-slate-400" />{profile.educationLevel}</span>
              )}
              {profile.yearsExperience !== undefined && (
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{profile.yearsExperience} years experience</span>
              )}
              {profile.workSetupPreference && (
                <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" />{profile.workSetupPreference}</span>
              )}
            </div>

            {/* Contact — only shown to authorized viewers */}
            {(viewerRole === "employer" || viewerRole === "admin") && (
              <div className="flex items-center gap-4 text-sm text-slate-500 pt-1">
                {profile.contactNumber && (
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{profile.contactNumber}</span>
                )}
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
              </div>
            )}

            {/* Salary */}
            {profile.expectedSalaryMin && (
              <div className="mt-2">
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                  Expected: PHP {profile.expectedSalaryMin.toLocaleString()} – {profile.expectedSalaryMax?.toLocaleString()}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills */}
          {profile.skills?.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-purple-500" /> Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="px-3 py-1 font-medium bg-purple-50 border-purple-200 text-purple-800">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Work Experience */}
          {profile.workExperience && profile.workExperience.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Briefcase className="w-4 h-4 text-blue-500" /> Work Experience
              </h2>
              <div className="space-y-4">
                {profile.workExperience.map((exp, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-blue-100">
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-400" />
                    <h3 className="font-semibold text-slate-900">{exp.position}</h3>
                    <p className="text-sm text-blue-700 font-medium">{exp.company}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(exp.startDate).toLocaleDateString("en-PH", { year: "numeric", month: "short" })} —{" "}
                      {exp.endDate ? new Date(exp.endDate).toLocaleDateString("en-PH", { year: "numeric", month: "short" }) : "Present"}
                    </p>
                    {exp.description && <p className="text-sm text-slate-600 mt-1.5">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <GraduationCap className="w-4 h-4 text-indigo-500" /> Education
              </h2>
              <div className="space-y-3">
                {profile.education.map((edu, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-indigo-100">
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-indigo-400" />
                    <h3 className="font-semibold text-slate-900">{edu.degree}</h3>
                    <p className="text-sm text-indigo-700">{edu.school}</p>
                    {edu.yearGraduated && <p className="text-xs text-slate-400">{edu.yearGraduated}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-amber-500" /> Certifications
              </h2>
              <div className="space-y-2">
                {profile.certifications.map((cert, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-sm font-semibold text-amber-900">{cert.name}</p>
                    <p className="text-xs text-amber-700">{cert.issuer}{cert.year ? ` (${cert.year})` : ""}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Languages */}
          {profile.languages && profile.languages.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-teal-500" /> Languages
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang, i) => (
                  <Badge key={i} variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">{lang}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* PWD Status */}
          {profile.pwdStatus && (
            <Card className="p-5 border-blue-200 bg-blue-50/50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-blue-500" /> PWD Status
              </h2>
              <p className="text-sm text-slate-700">Person with Disability (PWD)</p>
              {profile.disabilityType && <p className="text-xs text-slate-500 mt-0.5">{profile.disabilityType}</p>}
            </Card>
          )}

          {/* Preferences */}
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3">Work Preferences</h2>
            <div className="space-y-2 text-sm">
              {profile.workSetupPreference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Setup</span>
                  <span className="font-medium text-slate-900 capitalize">{profile.workSetupPreference}</span>
                </div>
              )}
              {profile.preferredWorkLocation && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="font-medium text-slate-900">{profile.preferredWorkLocation}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
