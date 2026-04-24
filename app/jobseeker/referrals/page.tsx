"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  UserCheck, 
  MapPin, 
  Building2, 
  Calendar, 
  ArrowRight, 
  Info,
  CheckCircle2,
  Clock,
  Briefcase
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Referral = {
  id: string;
  status: string;
  dateReferred: string;
  job: {
    id: string;
    positionTitle: string;
    employmentType: string;
    startingSalary: string | null;
    employerName: string;
    location: string;
  };
  applicationId: string | null;
};

export default function JobseekerReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/jobseeker/referrals");
        if (response.ok) {
          const data = await response.json();
          setReferrals(data.referrals || []);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <UserCheck className="w-6 h-6" />
          </div>
          My Referrals
        </h1>
        <p className="text-slate-600 mt-2">
          Review job opportunities specifically recommended for you by PESO GSC.
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 font-bold">How Referrals Work</AlertTitle>
        <AlertDescription className="text-blue-800 text-sm">
          A referral means PESO GSC has identified you as a strong candidate for a specific job. 
          Being referred gives you a higher visibility to the employer.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : referrals.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/30">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Referrals Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">
            Referrals are provided by PESO officers based on your profile skills and experience. Keep your profile updated!
          </p>
          <Link href="/jobseeker/profile" className="mt-6 inline-block">
            <Button variant="outline">Update My Profile</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {referrals.map((referral) => (
            <Card key={referral.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    PESO Referred
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(referral.dateReferred).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {referral.job.positionTitle}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <Building2 className="w-4 h-4" />
                  {referral.job.employerName}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {referral.job.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {referral.job.employmentType}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {referral.applicationId ? (
                    <Link href={`/jobseeker/applications/${referral.applicationId}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                        Application Submitted
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/jobseeker/jobs/${referral.job.id}`} className="flex-1">
                      <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                        Review & Apply
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {referral.status === 'referred' ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Awaiting Action</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{referral.status}</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] font-bold text-slate-900">
                  {referral.job.startingSalary || "Salary Negotiable"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
