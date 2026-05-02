"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { RefreshCw, X, UserPlus, FileCheck, Search, Printer, CheckCircle2, MessageSquare, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Applicant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  houseNumber: string | null;
  barangay: string | null;
  province: string | null;
  employmentStatus: string | null;
  employmentType: string | null;
  jobSearchStatus: string | null;
  profileImage: string | null;
  registrationDate: string | null;
};

type ResponsePayload = {
  applicants: Applicant[];
  total: number;
  limit: number;
  offset: number;
};

const STATUS_OPTIONS = ["all", "Unemployed", "Employed", "Self-employed", "Student", "Retired", "OFW", "Freelancer", "4PS", "PWD"] as const;
const SORT_OPTIONS = ["createdAt", "name", "email", "employmentStatus"] as const;
const PERIOD_OPTIONS = ["all", "7days", "30days", "90days", "1year"] as const;

function getPeriodRange(period: (typeof PERIOD_OPTIONS)[number]) {
  if (period === "all") {
    return { from: null as Date | null, to: null as Date | null };
  }

  const now = new Date();
  const from = new Date(now);

  if (period === "7days") from.setDate(now.getDate() - 7);
  if (period === "30days") from.setDate(now.getDate() - 30);
  if (period === "90days") from.setDate(now.getDate() - 90);
  if (period === "1year") from.setFullYear(now.getFullYear() - 1);

  return { from, to: now };
}

export default function AdminApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>("all");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [referring, setReferring] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [createdReferral, setCreatedReferral] = useState<any>(null);
  
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search, employmentStatus, period, sortBy, sortOrder]);

  const loadApplicants = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (employmentStatus !== "all") params.set("employmentStatus", employmentStatus);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", String(pageSize));
      params.set("offset", String((page - 1) * pageSize));

      const range = getPeriodRange(period);
      if (range.from) params.set("registeredFrom", range.from.toISOString().slice(0, 10));
      if (range.to) params.set("registeredTo", range.to.toISOString().slice(0, 10));

      const response = await fetch(`/api/admin/applicants?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load applicants");
      }

      const payload = (await response.json()) as ResponsePayload;
      setApplicants(payload.applicants ?? []);
      setTotal(payload.total ?? 0);
      setLastLoadedAt(new Date());
    } catch {
      setError("Unable to load applicants");
      setApplicants([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplicants();
  }, [employmentStatus, page, period, search, sortBy, sortOrder]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const openReferral = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setIsReferralOpen(true);
    setReferralSuccess(false);
    setCreatedReferral(null);
    setSelectedJobId(null);
    
    try {
      const res = await fetch("/api/admin/jobs/active");
      if (res.ok) {
        const data = await res.json();
        setActiveJobs(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load active jobs", err);
    }
  };

  const handleCreateReferral = async () => {
    if (!selectedJobId || !selectedApplicant) return;
    
    setReferring(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId,
          jobseekerId: selectedApplicant.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedReferral(data.data);
        setReferralSuccess(true);
      } else {
        throw new Error("Referral creation failed");
      }
    } catch (err) {
      alert("Failed to create referral");
    } finally {
      setReferring(false);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedApplicant || !messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedApplicant.id,
          role: "jobseeker",
          title: "Message from PESO Administrator",
          message: messageText.trim(),
          type: "system",
        }),
      });
      if (res.ok) {
        setIsNotifyOpen(false);
        setMessageText("");
        alert("Notification sent successfully.");
      } else {
        throw new Error("Failed to send notification");
      }
    } catch (err) {
      alert("Failed to send notification. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return activeJobs;
    return activeJobs.filter(j => 
      j.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
      j.employerName.toLowerCase().includes(jobSearch.toLowerCase())
    );
  }, [activeJobs, jobSearch]);

  const clearFilters = () => {
    setSearch("");
    setEmploymentStatus("all");
    setPeriod("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const activeFilterChips = [
    employmentStatus !== "all" ? `Status: ${employmentStatus}` : null,
    period !== "all" ? `Period: ${period}` : null,
    search.trim() ? `Search: ${search.trim()}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Job seekers</h1>
          <p className="mt-1 text-sm text-slate-600">Search, filter, and moderate job seeker records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/applicants/create">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4" />
              Create Jobseeker
            </Button>
          </Link>
          <Button variant="outline" type="button" onClick={() => void loadApplicants()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value as typeof employmentStatus)}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}>
            {PERIOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700" type="button" onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}>
            {sortOrder === "asc" ? "Oldest first" : "Newest first"}
          </button>
        </div>
      </div>

      {lastLoadedAt ? (
        <p className="text-xs text-slate-500">Last updated: {formatDate(lastLoadedAt.toISOString())}</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search job seekers by name, email, phone, city, or province"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-0 focus:border-slate-400"
        />
        <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {total} result{total === 1 ? "" : "s"}
        </div>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip) => (
            <span key={chip} className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700">
              {chip}
            </span>
          ))}
          <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900" onClick={clearFilters}>
            <X className="h-3 w-3" />
            Clear filters
          </button>
        </div>
      ) : null}

      {error ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading job seekers...</div>
        ) : applicants.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No job seekers match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job seeker</th>
                  <th className="px-4 py-3 font-semibold">Employment</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((applicant) => (
                  <tr key={applicant.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-950">{applicant.name}</div>
                      <div className="mt-1 text-slate-500">{applicant.email}</div>
                      <div className="text-slate-500">{applicant.phone || "No phone"}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      <div>{applicant.employmentStatus || "Unknown"}</div>
                      <div className="text-slate-500">{applicant.employmentType || "Type not specified"}</div>
                      <div className="text-slate-500">{applicant.jobSearchStatus || "No search status"}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-slate-900">{[applicant.houseNumber, applicant.barangay].filter(Boolean).join(", ") || (applicant.city || applicant.province ? "" : "Unknown")}</span>
                        <span className="text-slate-500">{[applicant.city, applicant.province].filter(Boolean).join(", ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {applicant.registrationDate ? formatDate(applicant.registrationDate) : "Unknown"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => void openReferral(applicant)}
                        >
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                          Refer
                        </Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => window.location.href = `/admin/applicants/${applicant.id}`}>View</Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button" 
                          onClick={() => {
                            setSelectedApplicant(applicant);
                            setIsNotifyOpen(true);
                          }}
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          Notify
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* Referral Modal */}
      <Dialog open={isReferralOpen} onOpenChange={setIsReferralOpen}>
        <DialogContent className={referralSuccess ? "max-w-3xl" : "max-w-2xl"}>
          {!referralSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Refer {selectedApplicant?.name}
                </DialogTitle>
                <DialogDescription>
                  Select an active job posting to refer this candidate.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search by job title or employer..." 
                    className="pl-9 rounded-xl border-slate-200"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-[40vh] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                  {filteredJobs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No active jobs found.
                    </div>
                  ) : (
                    filteredJobs.map((job) => (
                      <div 
                        key={job.id} 
                        className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedJobId === job.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900">{job.title}</p>
                            <p className="text-xs text-slate-500 font-medium">{job.employerName}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-semibold text-emerald-600">{job.salary || "N/A"}</p>
                            <p className="text-slate-400">{job.location || "General Santos"}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReferralOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8"
                  disabled={!selectedJobId || referring}
                  onClick={handleCreateReferral}
                >
                  {referring ? "Referring..." : "Confirm Referral"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2 mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Referral Successfully Created!</h3>
                <p className="text-sm text-slate-500">The employer has been notified. You can now print the referral slip below.</p>
              </div>

              {/* Printable Referral Slip */}
              <div className="overflow-y-auto max-h-[50vh] bg-slate-100 p-4 rounded-lg border border-slate-200 print:max-h-none print:p-0 print:border-none print:bg-white">
                <div id="referral-slip" className="bg-white border-2 border-slate-900 p-6 sm:p-8 rounded-sm shadow-sm font-serif max-w-xl mx-auto space-y-6 sm:space-y-8 relative overflow-hidden print:p-10 print:max-w-2xl print:space-y-10 print:border-none print:shadow-none">
                  {/* Watermark/Logo */}
                  <div className="absolute top-0 right-0 p-6 opacity-5 print:p-8">
                     <FileCheck className="h-32 w-32 print:h-48 print:w-48" />
                  </div>

                  {/* Header */}
                  <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4 print:pb-6">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase">REFERRAL SLIP</h2>
                    <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-slate-600 uppercase">Public Employment Service Office (PESO)</p>
                    <p className="text-[10px] sm:text-xs font-medium">GensanWorks - General Santos City</p>
                  </div>

                  {/* Date & Ref */}
                  <div className="flex justify-between text-xs sm:text-sm italic font-medium">
                    <span>Date: {formatDate(new Date().toISOString())}</span>
                    <span>Ref No: {createdReferral?.id.slice(0, 8).toUpperCase()}</span>
                  </div>

                  {/* Content */}
                  <div className="space-y-6 py-2 print:py-4">
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm uppercase font-bold text-slate-500 tracking-wider">To the Employer:</p>
                      <div className="pl-3 sm:pl-4">
                        <p className="text-base sm:text-lg font-black text-slate-950 uppercase">{activeJobs.find(j => j.id === selectedJobId)?.employerName}</p>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium">{activeJobs.find(j => j.id === selectedJobId)?.location || "General Santos City"}</p>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-slate-800 leading-relaxed">
                      <p>This is to refer <strong>{selectedApplicant?.name.toUpperCase()}</strong> for the position of <strong>{activeJobs.find(j => j.id === selectedJobId)?.title.toUpperCase()}</strong>.</p>
                      <p>The candidate has been screened and is being referred to your establishment for further interview and evaluation based on their qualifications and matching profile on GensanWorks.</p>
                      <p>Your kind consideration of this applicant would be highly appreciated.</p>
                    </div>
                  </div>

                  {/* Footer / Signatures */}
                  <div className="grid grid-cols-2 gap-8 sm:gap-12 pt-8 sm:pt-12 pb-2 sm:pb-4">
                    <div className="space-y-8 sm:space-y-12">
                      <div className="border-b border-slate-900 w-full pt-8 sm:pt-10"></div>
                      <p className="text-[8px] sm:text-[10px] font-bold uppercase text-center tracking-widest text-slate-500">Applicant's Signature</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-sm sm:text-base text-center font-black text-slate-950 uppercase">PESO OFFICER</p>
                      <div className="border-b border-slate-900 w-full"></div>
                      <p className="text-[8px] sm:text-[10px] font-bold uppercase text-center tracking-widest text-slate-500">Authorized Signature</p>
                    </div>
                  </div>

                  {/* Return Note */}
                  <div className="bg-slate-50 p-3 sm:p-4 border border-dashed border-slate-300 rounded-lg text-[9px] sm:text-[10px] text-slate-500 leading-tight">
                    <p className="font-bold mb-1 uppercase tracking-wider text-slate-700">Employer Feedback Note:</p>
                    <p>Kindly return this slip or update the candidate status on GensanWorks after the interview for record purposes. Thank you.</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsReferralOpen(false)}>Done</Button>
                <Button 
                  className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  Print Referral Slip
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Notify Modal */}
      <Dialog open={isNotifyOpen} onOpenChange={setIsNotifyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Notify {selectedApplicant?.name}
            </DialogTitle>
            <DialogDescription>
              Send a direct message/notification to this jobseeker.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea 
              placeholder="Type your message here..." 
              className="min-h-[120px] resize-none"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotifyOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={handleSendNotification}
              disabled={sending || !messageText.trim()}
            >
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}