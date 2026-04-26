"use client";

import { useEffect, useState, useRef } from "react";
import { X, Download, Printer, Loader2, Search, Eye, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import { ReferralSlipPdf } from "./referral-slip-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Applicant = {
  id: string;
  name: string;
  email: string;
  age?: number;
  sex?: string;
  address?: string;
  contact?: string;
  education?: string;
  nsrpId?: string;
};

type SlipData = {
  slipId: string;
  slipNumber: string;
  issuedAt: string;
  validUntil: string;
  applicant: Applicant;
  job: { id: string; title: string; psocCode?: string };
  employer: { name: string; address: string };
  qrCodeUrl?: string;
};

interface ReferralSlipGeneratorProps {
  jobId: string;
  jobTitle: string;
  employerName: string;
  employerAddress: string;
  employerId: string;
  onClose: () => void;
}

export function ReferralSlipGenerator({
  jobId, jobTitle, employerName, employerAddress, employerId, onClose,
}: ReferralSlipGeneratorProps) {
  const [step, setStep] = useState<"search" | "preview" | "done">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Applicant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [slipData, setSlipData] = useState<SlipData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Search applicants from NSRP pool
  const searchApplicants = async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/admin/applicants?q=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) {
      const data = await res.json() as { data?: Applicant[] };
      setResults(data.data ?? []);
    }
    setSearching(false);
  };

  useEffect(() => {
    const t = setTimeout(() => void searchApplicants(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const generateSlip = async () => {
    if (!selected) return;
    setGenerating(true);
    const res = await fetch("/api/admin/referral-slips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        applicantId: selected.id,
        overrideJobTitle: jobTitle,
        overrideCompanyName: employerName,
        overrideCompanyAddress: employerAddress,
      }),
    });
    if (res.ok) {
      const data = await res.json() as SlipData;
      setSlipData(data);
      
      // Generate QR Code URL pointing to the verification page
      const verificationUrl = `${window.location.origin}/referral/${data.slipNumber}`;
      try {
        const qrUrl = await QRCode.toDataURL(verificationUrl);
        setQrCodeDataUrl(qrUrl);
        data.qrCodeUrl = qrUrl; // Assuming we want to store it maybe? We actually need to save this.
      } catch (err) {
        console.error("Failed to generate QR code", err);
      }

      setStep("preview");
    }
    setGenerating(false);
  };

  const finalize = async (action: "print" | "download") => {
    if (!slipData) return;

    if (action === "print") {
      window.print();
    } else {
      // True PDF via @react-pdf/renderer
      setGenerating(true);
      try {
        const doc = <ReferralSlipPdf data={slipData} qrCodeDataUrl={qrCodeDataUrl} />;
        const asPdf = pdf();
        asPdf.updateContainer(doc);
        const blob = await asPdf.toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ReferralSlip_${slipData.slipNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to generate PDF", err);
      }
      setGenerating(false);
    }

    // Notify employer + jobseeker and save QR code URL
    await fetch("/api/admin/referral-slips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slipId: slipData.slipId,
        employerId,
        qrCodeUrl: qrCodeDataUrl,
      }),
    });

    setStep("done");
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Generate Referral Slip</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[400px]">Job: {jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-50 bg-slate-50/50">
          {(["search", "preview", "done"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? "bg-blue-600 text-white" :
                ["search", "preview", "done"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>{i + 1}</div>
              <span className={`text-xs capitalize ${step === s ? "text-blue-700 font-semibold" : "text-slate-400"}`}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Search */}
          {step === "search" && (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Search Applicant from NSRP Pool</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, NSRP ID, or contact..."
                    className="pl-9"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
                </div>
              </div>

              {results.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(selected?.id === r.id ? null : r)}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-all ${
                        selected?.id === r.id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {r.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{r.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.nsrpId && <Badge variant="outline" className="text-[10px] py-0 px-1.5">{r.nsrpId}</Badge>}
                          <span className="text-xs text-slate-500 truncate">{r.email}</span>
                        </div>
                      </div>
                      {selected?.id === r.id && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No applicants found matching &ldquo;{query}&rdquo;
                </div>
              )}

              {selected && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-sm font-semibold text-emerald-800">✓ Selected: {selected.name}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{selected.email} {selected.nsrpId ? `• NSRP: ${selected.nsrpId}` : ""}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && slipData && (
            <div className="p-6">
              {/* Referral Slip Preview */}
              <div ref={printRef} id="referral-slip-print" className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white font-serif">
                {/* Header */}
                <div className="bg-slate-50 border-b-2 border-slate-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-xs text-slate-500 font-bold">SEAL</div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Republic of the Philippines</p>
                        <p className="font-bold text-slate-900 text-base leading-tight">OFFICE OF THE CITY MAYOR</p>
                        <p className="text-sm text-slate-700">Public Employment Service Office</p>
                        <p className="text-sm text-slate-600">General Santos City</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1 flex flex-col items-end">
                      {/* Photo placeholder */}
                      <div className="w-20 h-24 bg-slate-100 border-2 border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400 mb-1">
                        Photo
                      </div>
                      <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded flex items-center justify-center overflow-hidden">
                        {qrCodeDataUrl ? (
                          <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-slate-900 tracking-widest uppercase">Referral Slip</p>
                    </div>
                    <div className="text-right text-xs text-slate-600 space-y-0.5">
                      <p><span className="font-semibold">Slip No:</span> {slipData.slipNumber}</p>
                      <p><span className="font-semibold">Date Issued:</span> {formatDateTime(slipData.issuedAt)}</p>
                      <p><span className="font-semibold">Valid Until:</span> {formatDate(slipData.validUntil)}</p>
                    </div>
                  </div>
                </div>

                {/* Recipient */}
                <div className="px-6 pt-5 pb-3">
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">The Personnel Manager</p>
                  <p className="text-sm font-bold text-slate-900">{slipData.employer.name}</p>
                  <p className="text-sm text-slate-600">{slipData.employer.address}</p>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4">
                  <p className="text-sm text-slate-700 font-semibold">Dear Sir/Madam:</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    This office has arranged for the following applicant to call on you regarding your opening:
                  </p>

                  {/* Applicant box */}
                  <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/50 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div><span className="text-slate-500">Name:</span> <span className="font-bold text-slate-900">{slipData.applicant.name}</span></div>
                    {slipData.applicant.nsrpId && <div><span className="text-slate-500">NSRP ID:</span> <span className="font-semibold">{slipData.applicant.nsrpId}</span></div>}
                    {slipData.applicant.age && <div><span className="text-slate-500">Age:</span> <span className="font-semibold">{slipData.applicant.age}</span></div>}
                    {slipData.applicant.sex && <div><span className="text-slate-500">Sex:</span> <span className="font-semibold">{slipData.applicant.sex}</span></div>}
                    {slipData.applicant.contact && <div><span className="text-slate-500">Contact:</span> <span className="font-semibold">{slipData.applicant.contact}</span></div>}
                    {slipData.applicant.address && <div className="col-span-2"><span className="text-slate-500">Address:</span> <span className="font-semibold">{slipData.applicant.address}</span></div>}
                    {slipData.applicant.education && <div className="col-span-2"><span className="text-slate-500">Education:</span> <span className="font-semibold">{slipData.applicant.education}</span></div>}
                  </div>

                  {/* Job box */}
                  <div className="border border-slate-300 rounded-lg p-4 bg-blue-50/30 text-sm">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1.5">Position Applied For</p>
                    <p className="font-bold text-slate-900 text-base">{slipData.job.title}</p>
                    {slipData.job.psocCode && <p className="text-xs text-slate-500 mt-0.5">PSOC Code: {slipData.job.psocCode}</p>}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    We would appreciate it very much if you would let us know the status of application of the said applicant. Thank you.
                  </p>
                </div>

                {/* Signatures */}
                <div className="px-6 pb-4">
                  <p className="text-sm text-slate-700 mb-6">Very Truly Yours,</p>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="font-bold text-slate-900 text-sm border-b border-slate-400 pb-1 inline-block">LORELIE GERONIMO PACQUIAO</p>
                      <p className="text-xs text-slate-600 mt-1">CITY MAYOR</p>
                      <p className="text-xs text-slate-500">By Authority of the City Mayor</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm border-b border-slate-400 pb-1 inline-block">NURHASAN A. JUANDAY</p>
                      <p className="text-xs text-slate-600 mt-1">SUPERVISING LABOR AND EMPLOYMENT OFFICER</p>
                      <p className="text-xs text-slate-500">PESO GENSAN</p>
                    </div>
                  </div>
                </div>

                {/* Feedback Stub */}
                <div className="mx-4 mb-4 border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">✂ Employer Feedback Stub — Please return to PESO Gensan</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                    <p><span className="font-semibold">Applicant:</span> {slipData.applicant.name}</p>
                    <p><span className="font-semibold">Slip No:</span> {slipData.slipNumber}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-2 text-xs text-slate-700">
                    <p>Result: ☐ Hired &nbsp;&nbsp; ☐ For Interview &nbsp;&nbsp; ☐ Not Hired</p>
                  </div>
                  <div className="flex gap-6 mt-2 text-xs text-slate-700">
                    <p>Date: _______________</p>
                    <p>HR Signature: _______________</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-800 px-6 py-3 text-center">
                  <p className="text-xs text-slate-300">📍 4th Floor General Santos City Investment Action Center, City Hall Drive, General Santos City, 9500</p>
                  <p className="text-xs text-slate-400 mt-0.5">📞 (083) 533-3479 &nbsp;|&nbsp; ✉ peso_gensan@yahoo.com</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Referral Slip Issued!</h3>
              <p className="text-sm text-slate-600 max-w-sm">
                The referral slip <strong>{slipData?.slipNumber}</strong> has been generated.
                The employer and applicant have both been notified. The applicant received a QR code backup.
              </p>
              <Button onClick={onClose} className="mt-4">Close</Button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step !== "done" && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <div className="flex items-center gap-2">
              {step === "search" && (
                <Button onClick={() => void generateSlip()} disabled={!selected || generating}>
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Eye className="w-4 h-4 mr-2" />Preview Slip</>}
                </Button>
              )}
              {step === "preview" && (
                <>
                  <Button variant="outline" onClick={() => setStep("search")}>← Back</Button>
                  <Button variant="outline" onClick={() => void finalize("print")}>
                    <Printer className="w-4 h-4 mr-2" />Print
                  </Button>
                  <Button onClick={() => void finalize("download")} disabled={generating}>
                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
