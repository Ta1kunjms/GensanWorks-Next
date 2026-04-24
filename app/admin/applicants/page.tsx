"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { RefreshCw, X } from "lucide-react";

type Applicant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const deleteApplicant = async (id: string) => {
    const confirmed = window.confirm("Delete this applicant? This cannot be undone.");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/applicants/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await loadApplicants();
    } catch {
      setError("Unable to delete applicant");
    } finally {
      setDeletingId(null);
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-950">Applicants</h1>
          <p className="mt-1 text-sm text-slate-600">Search, filter, and moderate applicant records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          placeholder="Search applicants by name, email, phone, city, or province"
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
          <div className="p-6 text-sm text-slate-600">Loading applicants...</div>
        ) : applicants.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No applicants match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Applicant</th>
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
                      <div className="text-slate-500">{applicant.employmentType || "No type"}</div>
                      <div className="text-slate-500">{applicant.jobSearchStatus || "No search status"}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {applicant.city || applicant.province ? `${applicant.city ?? ""}${applicant.city && applicant.province ? ", " : ""}${applicant.province ?? ""}` : "Unknown"}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {applicant.registrationDate ? formatDate(applicant.registrationDate) : "Unknown"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => window.open(`/jobseeker/profile?id=${applicant.id}`, "_blank")}>View</Button>
                        <Button variant="outline" size="sm" type="button" disabled={deletingId === applicant.id} onClick={() => void deleteApplicant(applicant.id)}>
                          {deletingId === applicant.id ? "Deleting..." : "Delete"}
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
    </div>
  );
}