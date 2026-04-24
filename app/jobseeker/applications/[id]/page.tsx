"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  FileText, 
  Building2, 
  MapPin, 
  ExternalLink,
  Info,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ApplicationDetail = {
  id: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  interviewDate: string | null;
  feedback: string | null;
  coverLetter: string | null;
  resumeUrl: string | null;
  job: {
    id: string;
    positionTitle: string;
    employmentType: string;
    location: string;
    employer: {
      establishmentName: string;
      email: string;
      contactPhone: string;
    }
  }
};

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/jobseeker/applications/${params.id}`);
        const data = await response.json();
        if (response.ok) {
          setApplication(data.application);
        } else {
          setError(data.error || "Failed to load application details");
        }
      } catch (err) {
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock, label: "Pending Review" };
      case "reviewed":
        return { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Info, label: "Under Review" };
      case "shortlisted":
        return { color: "bg-purple-100 text-purple-800 border-purple-200", icon: CheckCircle2, label: "Shortlisted" };
      case "interview":
        return { color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Calendar, label: "Interview Scheduled" };
      case "accepted":
        return { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, label: "Application Accepted" };
      case "rejected":
        return { color: "bg-rose-100 text-rose-800 border-rose-200", icon: AlertCircle, label: "Not Selected" };
      default:
        return { color: "bg-slate-100 text-slate-800 border-slate-200", icon: Info, label: status };
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card className="p-8 space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="pt-6 border-t">
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Application not found"}</AlertDescription>
        </Alert>
        <Link href="/jobseeker/applications">
          <Button variant="outline">Back to Applications</Button>
        </Link>
      </div>
    );
  }

  const status = getStatusConfig(application.status);
  const StatusIcon = status.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/jobseeker/applications">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-slate-600">
            <ChevronLeft className="w-4 h-4" />
            Back to Applications
          </Button>
        </Link>
        <div className="text-sm text-slate-500">
          Applied on {new Date(application.submittedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="p-6 md:p-8 bg-slate-50/50 border-b">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={`flex items-center gap-1.5 px-3 py-1 border ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{application.job.positionTitle}</h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{application.job.employer.establishmentName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{application.job.location}</span>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* Timeline / Progress */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Application Status History</h3>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                  {/* Current Status */}
                  <div className="relative flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${status.color.split(' ')[0]}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="ml-14">
                        <p className="text-sm font-bold text-slate-900">{status.label}</p>
                        <p className="text-xs text-slate-500">Current status as of today</p>
                      </div>
                    </div>
                  </div>

                  {/* Submission */}
                  <div className="relative flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="absolute left-0 w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="ml-14">
                        <p className="text-sm font-bold text-slate-700">Application Submitted</p>
                        <p className="text-xs text-slate-500">{new Date(application.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              {application.coverLetter && (
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    My Cover Letter
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {application.coverLetter}
                  </div>
                </div>
              )}

              {/* Resume */}
              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Resume Attached
                </h3>
                {application.resumeUrl ? (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Resume Attachment</p>
                        <p className="text-xs text-slate-500">PDF Document</p>
                      </div>
                    </div>
                    <Link href={application.resumeUrl} target="_blank">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        View File
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No resume attachment provided.</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Employer Feedback */}
          {(application.feedback || application.interviewDate) && (
            <Card className="p-6 border-blue-200 bg-blue-50/50 shadow-sm">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Employer Update
              </h3>
              <div className="space-y-4">
                {application.interviewDate && (
                  <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Interview Scheduled</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {new Date(application.interviewDate).toLocaleString()}
                    </p>
                  </div>
                )}
                {application.feedback && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">Note from Employer:</p>
                    <p className="text-xs text-slate-600 leading-relaxed italic">"{application.feedback}"</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-6 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Job Summary</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Position</p>
                <p className="text-sm font-bold text-slate-900">{application.job.positionTitle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Type</p>
                <Badge variant="outline" className="font-normal">{application.job.employmentType}</Badge>
              </div>
              <Link href={`/jobseeker/jobs/${application.job.id}`} className="block pt-2">
                <Button variant="outline" className="w-full text-xs h-9">View Full Job Post</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you have questions about this application, you can reach out to the employer or contact PESO GSC.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {application.job.employer.establishmentName}
              </div>
              <Button variant="link" className="p-0 h-auto text-[10px] text-blue-600">Contact Employer</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
