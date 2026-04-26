"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  MapPin, 
  Building2, 
  QrCode,
  Calendar,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ReferralSlip = {
  id: string;
  slipNumber: string;
  issuedAt: string;
  validUntil: string;
  status: "issued" | "hired" | "not_hired";
  qrCodeUrl: string | null;
  jobTitle: string;
  employerName: string;
  employerAddress: string;
};

export default function JobseekerReferralsPage() {
  const [slips, setSlips] = useState<ReferralSlip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlips = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/jobseeker/referrals");
        if (res.ok) {
          const data = await res.json() as { slips?: ReferralSlip[] };
          setSlips(data.slips ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch referral slips", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchSlips();
  }, []);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">My Referral Slips</h1>
        <p className="text-sm text-slate-500 mt-1">
          Official PESO referral slips issued to you for job applications. Present these to employers.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : slips.length === 0 ? (
        <Card className="p-16 text-center border-dashed">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No referral slips yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any active referral slips. PESO Admin will issue a slip when you are referred to an employer.
          </p>
          <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
            <Link href="/jobseeker/jobs">Browse Jobs</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {slips.map((slip) => {
            const expired = isExpired(slip.validUntil);
            
            return (
              <Card key={slip.id} className={`overflow-hidden transition-all ${expired ? 'opacity-75' : 'hover:shadow-md border-blue-100'}`}>
                {/* Header */}
                <div className={`p-4 border-b ${expired ? 'bg-slate-50 border-slate-100' : 'bg-blue-50/50 border-blue-100'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={`font-mono text-xs ${expired ? 'text-slate-500 border-slate-300' : 'text-blue-700 border-blue-300 bg-blue-50'}`}>
                      {slip.slipNumber}
                    </Badge>
                    <Badge className={`
                      ${slip.status === 'hired' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        slip.status === 'not_hired' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                        expired ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'}
                    `}>
                      {slip.status === 'hired' ? 'Hired' :
                       slip.status === 'not_hired' ? 'Not Hired' :
                       expired ? 'Expired' : 'Active'}
                    </Badge>
                  </div>
                  <h3 className={`font-bold text-lg line-clamp-1 ${expired ? 'text-slate-700' : 'text-slate-900'}`}>
                    {slip.jobTitle}
                  </h3>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{slip.employerName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-600 line-clamp-2">{slip.employerAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm pt-2 border-t border-slate-100">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 flex justify-between items-center text-xs text-slate-500">
                      <span>Issued: {formatDate(slip.issuedAt)}</span>
                      <span className={expired ? 'text-rose-600 font-medium' : ''}>
                        Valid till: {formatDate(slip.validUntil)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer/Action */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {slip.qrCodeUrl ? (
                      <Badge variant="outline" className="gap-1.5 bg-white">
                        <QrCode className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-600">QR Ready</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 bg-white text-amber-600 border-amber-200">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs">No QR</span>
                      </Badge>
                    )}
                  </div>
                  <Button asChild size="sm" variant={expired ? "outline" : "default"} className={!expired ? "bg-blue-600 hover:bg-blue-700" : ""}>
                    <Link href={`/referral/${slip.slipNumber}`} className="gap-1">
                      View Slip <ChevronRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
