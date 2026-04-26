"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  MapPin,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Loader2,
  Download
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type VerificationResult = {
  id: string;
  slipNumber: string;
  issuedAt: string;
  validUntil: string;
  status: "issued" | "hired" | "not_hired";
  pdfUrl: string | null;
  applicant: {
    name: string;
    email: string;
    nsrpId: string | null;
    age: number | null;
    sex: string | null;
  };
  job: {
    title: string;
    employerName: string;
    employerAddress: string;
  };
};

export default function ReferralSlipVerificationPage() {
  const params = useParams<{ 'slip-number': string }>();
  const slipNumber = params?.['slip-number'];

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slipNumber) return;
    
    const verifySlip = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/referrals/${slipNumber}`);
        if (res.ok) {
          const data = await res.json() as VerificationResult;
          setResult(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Verification failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    void verifySlip();
  }, [slipNumber]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 pt-12">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Card className="p-8 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
        <Card className="p-10 max-w-md w-full text-center space-y-4 shadow-lg border-rose-100">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Invalid Referral Slip</h1>
          <p className="text-slate-600">
            The referral slip <strong>{slipNumber}</strong> could not be found or verified. Please check the slip number and try again.
          </p>
          <div className="pt-4">
            <Button asChild className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(result.validUntil) < new Date();
  const isValid = !isExpired && result.status !== "not_hired";

  return (
    <div className="min-h-[80vh] flex justify-center p-6 bg-slate-50 pt-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Referral Verification</h1>
          <p className="text-slate-500">Official PESO Gensan Document Verification</p>
        </div>

        <Card className="overflow-hidden shadow-lg border-0 ring-1 ring-slate-200">
          {/* Header Status Bar */}
          <div className={`p-6 text-center ${
            isValid ? 'bg-emerald-600 text-white' : 
            isExpired ? 'bg-amber-600 text-white' : 
            'bg-rose-600 text-white'
          }`}>
            <div className="flex justify-center mb-3">
              {isValid ? <CheckCircle2 className="w-12 h-12" /> : 
               isExpired ? <AlertTriangle className="w-12 h-12" /> : 
               <XCircle className="w-12 h-12" />}
            </div>
            <h2 className="text-2xl font-bold">
              {isValid ? 'VERIFIED & ACTIVE' : 
               isExpired ? 'EXPIRED' : 
               'NOT VALID'}
            </h2>
            <p className="opacity-90 mt-1 font-mono">{result.slipNumber}</p>
          </div>

          <div className="p-8 space-y-8 bg-white">
            {/* Applicant Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Applicant Information
              </h3>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{result.applicant.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.applicant.nsrpId && (
                      <Badge variant="outline" className="text-xs bg-slate-50">NSRP: {result.applicant.nsrpId}</Badge>
                    )}
                    {(result.applicant.age || result.applicant.sex) && (
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {[result.applicant.age ? `${result.applicant.age} yrs` : null, result.applicant.sex].filter(Boolean).join(" • ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Referred To
              </h3>
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Position</p>
                  <p className="font-semibold text-slate-900 text-lg">{result.job.title}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Employer</p>
                      <p className="text-sm font-medium text-slate-900">{result.job.employerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-sm font-medium text-slate-900">{result.job.employerAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validity Details */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Issued On
                </p>
                <p className="text-sm font-medium text-slate-900">{formatDate(result.issuedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Valid Until
                </p>
                <p className={`text-sm font-medium ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatDate(result.validUntil)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              To verify further details, please contact PESO Gensan.
            </p>
            {result.pdfUrl && (
              <Button variant="outline" asChild className="w-full sm:w-auto bg-white">
                <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" /> Download Original PDF
                </a>
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
