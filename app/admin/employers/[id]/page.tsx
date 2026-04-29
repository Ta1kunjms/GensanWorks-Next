"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Loader2, User, Mail, Phone, MapPin, Building2, 
  Globe, Shield, BadgeCheck, FileText, CheckCircle2, XCircle,
  Building, Briefcase, Info, ExternalLink, Hash, Users, Calendar
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type EmployerProfile = Record<string, any>;

export default function AdminViewEmployerProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/employers/${id}`, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Unable to load employer profile");
          return;
        }

        setProfile(data.profile);
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
        <p className="text-slate-500 font-medium">Loading employer record...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="p-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Profile Not Found</h2>
            <p className="text-slate-500">{error || "The requested employer record could not be found."}</p>
          </div>
          <Button onClick={() => router.push("/admin/employers")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employers
          </Button>
        </Card>
      </div>
    );
  }

  const establishmentName = profile.establishment_name || "Unnamed Establishment";
  const profileImageSrc = profile.profile_image || `https://api.dicebear.com/7.x/initials/svg?seed=${establishmentName}`;

  const InfoItem = ({ label, value, icon: Icon, fullWidth }: { label: string; value: any; icon?: any; fullWidth?: boolean }) => (
    <div className={`flex gap-3 py-2 border-b border-slate-50 last:border-0 ${fullWidth ? 'col-span-full' : ''}`}>
      {Icon && <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />}
      <div className="space-y-0.5 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm text-slate-900 font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );

  const FileItem = ({ label, fileUrl, subtitle }: { label: string; fileUrl?: string; subtitle: string }) => (
    <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center text-slate-400 shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{label}</p>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
      </div>
      {fileUrl ? (
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">None</span>
      )}
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-500';
      case 'rejected': return 'bg-rose-500';
      case 'suspended': return 'bg-slate-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 sticky top-0 bg-white/80 backdrop-blur-md z-10 pt-4">
        <div className="space-y-1">
          <Button onClick={() => router.push("/admin/employers")} variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employers
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{establishmentName}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-sm text-slate-500 flex items-center gap-1">
              ID: <span className="font-mono font-bold text-slate-900 uppercase">{profile.id.slice(0, 8)}</span>
            </p>
            {profile.account_status === 'approved' && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none">Print Profile</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center space-y-4 relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="mx-auto h-28 w-28 rounded-3xl bg-white/10 overflow-hidden border-4 border-white/20 shadow-lg group">
              <img src={profileImageSrc} alt={establishmentName} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold truncate px-2">{establishmentName}</h2>
              <p className="text-xs text-slate-400 truncate">{profile.email}</p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <span className={`px-4 py-1 text-white text-[10px] font-bold rounded-full uppercase tracking-widest border border-white/10 shadow-sm ${getStatusColor(profile.account_status)}`}>
                {profile.account_status || "Pending"}
              </span>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="h-3.5 w-3.5 text-indigo-500" /> Primary Contact
            </h3>
            <div className="space-y-1">
              <InfoItem label="Contact Person" value={profile.contact_person} />
              <InfoItem label="Designation" value={profile.designation} />
              <InfoItem label="Mobile/Phone" value={profile.contact_phone} icon={Phone} />
              <InfoItem label="Email Address" value={profile.email} icon={Mail} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="h-3.5 w-3.5 text-rose-500" /> Main Office
            </h3>
            <div className="space-y-1 text-left">
              <InfoItem label="Full Address" value={profile.address} fullWidth />
              <InfoItem label="City / Province" value={`${profile.city || ''}, ${profile.province || ''}`.trim() || '—'} />
              <InfoItem label="Zip Code" value={profile.zip_code} />
            </div>
          </Card>
        </div>

        {/* Center/Right Content */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Section: Establishment Detail */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Building2 className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">I. Establishment Information</h3>
            </div>
            <Card className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoItem label="Establishment Name" value={profile.establishment_name} icon={Building} />
              <InfoItem label="Acronym/Abbreviation" value={profile.acronym_abbreviation} />
              <InfoItem label="Tax ID (TIN)" value={profile.company_tax_id || profile.tin} icon={Hash} />
              <InfoItem label="Industry" value={profile.industry || profile.industry_code?.join(", ")} icon={Briefcase} />
              <InfoItem label="Type of Establishment" value={profile.type_of_establishment} />
              <InfoItem label="Total Work Force" value={profile.total_paid_employees || profile.total_work_force} icon={Users} />
            </Card>
          </section>

          {/* Section: Location Detail */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">II. Location & Geographic Detail</h3>
            </div>
            <Card className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <InfoItem label="Street/Bldg Address" value={profile.address} fullWidth />
              <InfoItem label="Barangay" value={profile.barangay} />
              <InfoItem label="City / Municipality" value={profile.city} />
              <InfoItem label="Province" value={profile.province} />
              <InfoItem label="Geographic Code" value={profile.geographic_code} />
              <InfoItem label="Zip Code" value={profile.zip_code} />
            </Card>
          </section>

          {/* Section: Compliance / Files */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">III. Compliance & Legal Documents</h3>
            </div>
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileItem label="BIR 2303" subtitle="Registration Certificate" fileUrl={profile.bir_2303_file} />
                <FileItem label="Business Permit" subtitle="Mayor's Permit / LGU" fileUrl={profile.business_permit_file} />
                <FileItem label="DOLE Certification" subtitle="Registration File" fileUrl={profile.dole_certification_file} />
                <FileItem label="Company Profile" subtitle="Company Overview" fileUrl={profile.company_profile_file} />
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
                      <Globe className="h-6 w-6 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">SRS Subscription Status</p>
                      <p className="text-xs text-slate-400">NSRP Compliance Status</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.srs_subscriber_intent || profile.is_srs_subscribed ? (
                      <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">Subscribed</span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-700 text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-widest border border-white/5">Not Opted In</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Section: SRS Footer / Certification */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">IV. SRS/NSRP Form Certification</h3>
            </div>
            <Card className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <InfoItem label="Prepared By" value={profile.srs_prepared_by} />
              <InfoItem label="Designation" value={profile.srs_prepared_designation} />
              <InfoItem label="Date Prepared" value={profile.srs_prepared_date ? formatDate(profile.srs_prepared_date) : null} icon={Calendar} />
              <InfoItem label="Contact Info" value={profile.srs_prepared_contact} icon={Phone} />
            </Card>
          </section>

          {/* Section: Company Description */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                <Info className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">V. Company Description</h3>
            </div>
            <Card className="p-6">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {profile.description || "No description provided."}
              </p>
            </Card>
          </section>

          {/* Account Meta */}
          <Card className="p-4 bg-slate-50 border-none shadow-none flex flex-wrap justify-between gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            <span>Account Created: {formatDate(profile.created_at)}</span>
            <span>Last Updated: {formatDate(profile.updated_at)}</span>
          </Card>

        </div>
      </div>
    </div>
  );
}
