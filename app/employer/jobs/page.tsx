"use client";
export const dynamic = "force-dynamic";
// Version: 1.0.2 - NSRP Fix

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pencil,
  Archive,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Layers,
  Search,
  Filter,
  X,
} from "lucide-react";
import { SRS_INDUSTRY_CODES } from "@/lib/validation-schemas";

const EDUCATION_LEVEL_OPTIONS = [
  "No Formal Education",
  "Elementary Undergraduate",
  "Elementary Graduate",
  "High School Undergraduate",
  "High School Graduate",
  "College Undergraduate",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate Degree",
  "Technical Graduate",
];

const SKILL_OPTIONS = [
  // NSRP Standard Skills
  "Auto Mechanic",
  "Beautician",
  "Carpentry Work",
  "Computer Literate",
  "Domestic Chores",
  "Driver",
  "Electrician",
  "Embroidery",
  "Gardening",
  "Masonry",
  "Painter/Artist",
  "Painting Jobs",
  "Photography",
  "Plumbing",
  "Sewing Dresses",
  "Stenography",
  "Tailoring",
  // Common Soft Skills
  "Problem Solving",
  "Teamwork",
  "Communication",
  "Technical Writing",
  "Critical Thinking",
  "Leadership",
  "Time Management",
  "Adaptability",
  "Interpersonal Skills",
  // Technical/Industry Skills
  "React",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "Python",
  "PHP",
  "Laravel",
  "Customer Service",
  "Microsoft Excel",
  "Accounting",
  "Project Management",
  "Data Entry",
  "Sales",
  "Digital Marketing",
  "Graphic Design",
  "UI/UX Design",
  "Mobile App Development",
  "Cloud Computing",
  "Cybersecurity",
  "Data Analysis",
  "Search Engine Optimization (SEO)",
  "Social Media Management",
  "Content Writing",
  "Video Editing",
  "Event Planning",
  "Public Speaking",
  "Inventory Management",
  "Quality Assurance",
  "Customer Relationship Management (CRM)",
];

type Job = {
  id: string;
  positionTitle: string;
  description: string;
  location: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  employmentType: string;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryPeriod: string | null;
  mainSkillOrSpecialization?: string;
  minimumEducationRequired?: string;
  yearsOfExperienceRequired?: string;
  vacantPositions?: string;
  paidEmployees?: string;
  industryCodes: string[] | null;
  status: "draft" | "pending" | "active" | "closed" | "archived" | null;
  jobStatus?: string;
  job_status?: string;
  jobStatusPTC?: string;
  isPublished: boolean;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  workType?: string | null;
  rejectionReason?: string;
  preparedByName?: string;
  preparedByDesignation?: string;
  preparedByContact?: string;
  [key: string]: unknown;
};

const STATUS_OPTIONS = ["draft", "pending", "active", "closed", "archived"] as const;

function unwrapApiData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return (payload as { data?: T }).data ?? null;
  }
  return payload as T;
}

function normalizeStatus(job: Job) {
  const raw = String(job.status ?? job.jobStatus ?? job.job_status ?? job.jobStatusPTC ?? "").toLowerCase();
  if (job.archived) return "archived";
  if (raw === "approved" || raw === "active") return "active";
  if (raw === "rejected" || raw === "needs_changes") return "rejected";
  if (raw === "draft") return "draft";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const buildInitialForm = (profile?: any) => ({
  positionTitle: "",
  description: "",
  location: profile?.address || "",
  barangay: profile?.barangay || "",
  municipality: profile?.city || "General Santos City",
  province: profile?.province || "South Cotabato",
  employmentType: "onsite",
  // SRS Form 2A Column 7: Job Status (P=Permanent, T=Temporary, C=Contractual)
  employmentContractType: "P" as "P" | "T" | "C",
  // SRS Form 2A industry code for this specific job
  industryCode: Array.isArray(profile?.industry_code) ? profile.industry_code[0] || "" : "",
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: "monthly",
  mainSkillOrSpecialization: "",
  mainSkillDesired: "",
  minimumEducationRequired: "",
  yearsOfExperienceRequired: "",
  vacantPositions: profile?.total_vacant_positions ? String(profile.total_vacant_positions) : "1",
  vacancies: profile?.total_vacant_positions ? String(profile.total_vacant_positions) : "1",
  paidEmployees: profile?.total_paid_employees ? String(profile.total_paid_employees) : "",
  industryCodes: Array.isArray(profile?.industry_code) ? profile.industry_code : [],
  jobStatus: "P",
  preparedByName: profile?.srs_prepared_by || "",
  preparedByDesignation: profile?.srs_prepared_designation || "",
  preparedByContact: profile?.srs_prepared_contact || "",
  startingSalary: "",
  workType: "Full-time",
  deadline: "",
});

function SkillTagsInput({ 
  value, 
  onChange, 
  id 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  id: string 
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tags = useMemo(() => value.split(",").map(s => s.trim()).filter(Boolean), [value]);

  const filteredSuggestions = useMemo(() => {
    if (!input.trim()) return [];
    const lowerInput = input.toLowerCase();
    return SKILL_OPTIONS.filter(
      skill => 
        skill.toLowerCase().includes(lowerInput) && 
        !tags.some(tag => tag.toLowerCase() === skill.toLowerCase())
    ).slice(0, 10);
  }, [input, tags]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/,/g, "");
    if (trimmed && !tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange(value ? `${value}, ${trimmed}` : trimmed);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (filteredSuggestions.length > 0 && input.trim()) {
        addTag(filteredSuggestions[0]);
      } else {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-3 relative">
      <div className="flex flex-wrap gap-2 p-2 min-h-[46px] rounded-xl border border-slate-200 bg-white focus-within:border-slate-400 transition-all">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg group animate-in fade-in zoom-in duration-200">
            {tag}
            <button 
              type="button" 
              onClick={() => removeTag(i)}
              className="hover:text-red-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow clicking suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={tags.length === 0 ? "e.g. Programming, Graphic Design..." : "Add another..."}
          className="flex-1 bg-transparent outline-none text-sm min-w-[120px] py-1 px-1"
          autoComplete="off"
        />
      </div>
      
      {/* Autocomplete Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1">
            {filteredSuggestions.map((skill, i) => (
              <button
                key={skill}
                type="button"
                onClick={() => addTag(skill)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-slate-100 flex items-center justify-between group ${i === 0 ? 'bg-slate-50' : ''}`}
              >
                <span className="font-medium text-slate-700">{skill}</span>
                {i === 0 && <span className="text-[10px] text-slate-400 font-bold border border-slate-200 px-1.5 rounded uppercase">Enter</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Suggestions (Default when no input) */}
      {!input.trim() && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 mt-1">Suggested:</span>
          {["Problem Solving", "Teamwork", "Communication", "Critical Thinking", "Adaptability"]
            .filter(s => !tags.some(t => t.toLowerCase() === s.toLowerCase()))
            .slice(0, 5)
            .map(s => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function EmployerJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [archivingJobId, setArchivingJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(buildInitialForm());
  const [editForm, setEditForm] = useState(buildInitialForm());
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "rejected" | "draft" | "archived">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [educationFilter, setEducationFilter] = useState("all");
  const [sortOption, setSortOption] = useState<"date_desc" | "date_asc" | "salary_desc" | "salary_asc">("date_desc");
  const [tab, setTab] = useState("list");
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [employerProfile, setEmployerProfile] = useState<any>(null);

  const industryOptions = useMemo(
    () =>
      SRS_INDUSTRY_CODES.map(({ code, label }) => ({ code, name: label }))
        .sort((a, b) => parseInt(a.code) - parseInt(b.code)),
    []
  );
  const educationLevels = EDUCATION_LEVEL_OPTIONS;

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/employer/jobs", { cache: "no-store" });
      if (!response.ok) {
        setJobs([]);
        return;
      }
      const payload = await response.json();
      const data = unwrapApiData<{ jobs?: Job[]; results?: Job[] }>(payload);
      setJobs(data?.jobs ?? data?.results ?? []);
      
      const profileResponse = await fetch("/api/employer/profile", { cache: "no-store" });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const profile = unwrapApiData<{ profile?: any }>(profileData);
        const p = profile?.profile;
        if (p) {
          setAccountStatus(p.account_status ?? null);
          setEmployerProfile(p);
          // If we're not editing, update the empty form with profile defaults
          setForm(prev => {
            // Only update if the form is still empty/initial
            if (!prev.positionTitle && !prev.description) {
              return buildInitialForm(p);
            }
            return prev;
          });
        }
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const statusBuckets = useMemo(() => {
    const base = { pending: 0, active: 0, rejected: 0, draft: 0, archived: 0 };
    jobs.forEach((job) => {
      const normalized = normalizeStatus(job) as keyof typeof base;
      if (base[normalized] !== undefined) {
        base[normalized]++;
      } else {
        base.pending++;
      }
    });
    return base;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = jobs.filter((job) => {
      const normalized = normalizeStatus(job);
      if (statusFilter !== "all" && normalized !== statusFilter) return false;
      if (statusFilter !== "archived" && job.archived) return false;

      if (term) {
        const haystack = [
          job.positionTitle,
          job.title ?? "",
          job.location,
          job.mainSkillOrSpecialization ?? "",
          job.municipality ?? "",
          job.province ?? "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (industryFilter !== "all") {
        const codes = Array.isArray(job.industryCodes) ? job.industryCodes : [];
        if (!codes.includes(industryFilter)) return false;
      }

      if (educationFilter !== "all") {
        const edu = job.minimumEducationRequired ?? "";
        if (typeof edu === "string" && edu.toLowerCase() !== educationFilter.toLowerCase()) return false;
      }

      return true;
    });

    const sortMap: Record<typeof sortOption, (a: Job, b: Job) => number> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      date_desc: (a, b) => new Date((b as any).updatedAt ?? b.createdAt ?? 0).getTime() - new Date((a as any).updatedAt ?? a.createdAt ?? 0).getTime(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      date_asc: (a, b) => new Date((a as any).updatedAt ?? a.createdAt ?? 0).getTime() - new Date((b as any).updatedAt ?? b.createdAt ?? 0).getTime(),
      salary_desc: (a, b) => (Number(b.salaryMin) || 0) - (Number(a.salaryMin) || 0),
      salary_asc: (a, b) => (Number(a.salaryMin) || 0) - (Number(b.salaryMin) || 0),
    };

    return filtered.sort(sortMap[sortOption]);
  }, [jobs, statusFilter, searchTerm, industryFilter, educationFilter, sortOption]);

  const handleSubmit = async (asDraft = false) => {
    setSaving(true);
    setError("");

    try {
      const source = editingJobId ? editForm : form;
      const payload = {
        positionTitle: source.positionTitle.trim(),
        description: source.description.trim(),
        minimumEducationRequired: source.minimumEducationRequired,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mainSkillDesired: (source as any).mainSkillDesired || (source as any).mainSkillOrSpecialization,
        yearsOfExperienceRequired: source.yearsOfExperienceRequired ? Number(source.yearsOfExperienceRequired) : 0,
        salaryMin: source.salaryMin ? Number(source.salaryMin) : undefined,
        salaryMax: source.salaryMax ? Number(source.salaryMax) : undefined,
        salaryPeriod: source.salaryPeriod || "monthly",
        startingSalary: (source as any).startingSalary ? Number((source as any).startingSalary) : (source as any).salaryMin ? Number((source as any).salaryMin) : undefined,
        vacancies: Number((source as any).vacancies || (source as any).vacantPositions) || 1,
        location: source.location.trim() || undefined,
        employmentType: source.employmentType || "onsite",
        workType: (source as any).workType || "Full-time",
        // SRS Form 2A: Job Status (P/T/C) and industry code
        employmentContractType: (source as any).employmentContractType || "P",
        industryCode: (source as any).industryCode || undefined,
        deadline: (source as any).deadline || undefined,
        saveAsDraft: asDraft,
      };

      const endpoint = editingJobId ? `/api/employer/jobs/${editingJobId}` : "/api/employer/jobs";
      const method = editingJobId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? `Failed to ${asDraft ? "save draft" : "submit job"}`);
        return;
      }

      toast({
        title: asDraft ? "Draft saved" : "Job submitted",
        description: data.message || (asDraft ? "Draft synced to your account." : "Submitted for admin review."),
      });

      setForm(buildInitialForm());
      setEditingJobId(null);
      setShowForm(false);
      await loadJobs();
    } catch {
      setError(`Failed to ${asDraft ? "save draft" : "submit job"}`);
    } finally {
      setSaving(false);
    }
  };

  const submitJob = (e: FormEvent) => {
    e.preventDefault();
    void handleSubmit(false);
  };

  const handleSaveDraft = () => {
    void handleSubmit(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) return;
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
      toast({ title: "Job deleted", description: "Job posting removed successfully." });
      await loadJobs();
    } catch {
      toast({ title: "Error", description: "Failed to delete job", variant: "destructive" });
    }
  };

  const handleArchiveJob = async (jobId: string) => {
    if (!window.confirm("Archive this job posting?")) return;
    setArchivingJobId(jobId);
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) throw new Error("Failed to archive job");
      toast({ title: "Job archived", description: "Job posting archived successfully." });
      await loadJobs();
    } catch {
      toast({ title: "Error", description: "Failed to archive job", variant: "destructive" });
    } finally {
      setArchivingJobId(null);
    }
  };

  const startEdit = (job: Job) => {
    setEditingJobId(job.id);
    setEditForm({
      ...buildInitialForm(),
      positionTitle: job.positionTitle || "",
      description: job.description || "",
      location: job.location || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      barangay: (job as any).barangay ?? "",
      municipality: job.municipality || "General Santos City",
      province: job.province || "South Cotabato",
      salaryMin: job.salaryMin || "",
      salaryMax: job.salaryMax || "",
      salaryPeriod: job.salaryPeriod || "monthly",
      mainSkillOrSpecialization: job.mainSkillOrSpecialization || "",
      mainSkillDesired: (job as any).mainSkillDesired || job.mainSkillOrSpecialization || "",
      minimumEducationRequired: job.minimumEducationRequired || "",
      yearsOfExperienceRequired: String(job.yearsOfExperienceRequired || ""),
      vacantPositions: String(job.vacantPositions || "1"),
      vacancies: String(job.vacantPositions || "1"),
      paidEmployees: String(job.paidEmployees || ""),
      industryCodes: Array.isArray(job.industryCodes) ? job.industryCodes : [],
      employmentType: job.employmentType || "onsite",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jobStatus: (job as any).jobStatus ?? "P",
      preparedByName: job.preparedByName || "",
      preparedByDesignation: job.preparedByDesignation || "",
      preparedByContact: job.preparedByContact || "",
      startingSalary: String(job.salaryMin || ""),
      workType: (job as any).workType || "Full-time",
    });
    setShowForm(true);
    setTab("create");
  };

  const cancelEditing = () => {
    setEditingJobId(null);
    setForm(buildInitialForm());
    setShowForm(false);
    setTab("list");
  };

  const updateStatus = async (jobId: string, status: "draft" | "pending" | "active" | "closed" | "archived") => {
    try {
      const response = await fetch(`/api/employer/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Could not update job status");
      await loadJobs();
    } catch {
      setError("Could not update job status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employer workspace</p>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Job Postings
          </h2>
          <p className="text-sm text-slate-600">
            Create, edit, and track the status of your roles. Updates are reviewed by administrators before going live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadJobs()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            disabled={accountStatus !== "approved"}
            onClick={() => {
              if (showForm) {
                cancelEditing();
              } else {
                if (!editingJobId) {
                  setForm(buildInitialForm(employerProfile));
                }
                setShowForm(true);
                setTab("create");
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? "Close Form" : "Create Job"}
          </Button>
        </div>
      </div>

      {accountStatus && accountStatus !== "approved" && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-800 font-bold">Account Not Approved</AlertTitle>
          <AlertDescription className="text-red-700">
            Your Employer Account is currently <span className="font-bold uppercase">{accountStatus}</span>. You cannot post jobs until an administrator approves your account. Please ensure your <Link href="/employer/profile" className="underline font-medium">Profile</Link> and required compliance documents are complete.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job title, location"
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v as Parameters<typeof setStatusFilter>[0])}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industryOptions.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  {opt.code} - {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={educationFilter} onValueChange={setEducationFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Education" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any education</SelectItem>
              {educationLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOption} onValueChange={(v: string) => setSortOption(v as "date_desc" | "date_asc" | "salary_desc" | "salary_asc")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest first</SelectItem>
              <SelectItem value="date_asc">Oldest first</SelectItem>
              <SelectItem value="salary_desc">Highest salary</SelectItem>
              <SelectItem value="salary_asc">Lowest salary</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setIndustryFilter("all");
              setEducationFilter("all");
              setSortOption("date_desc");
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {(["pending", "active", "draft", "rejected", "archived"] as const).map((status) => (
          <Card key={status} className="cursor-pointer border-slate-200" onClick={() => setStatusFilter(status)}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-slate-600 capitalize">{status}</p>
                <p className="text-2xl font-bold text-slate-900">{statusBuckets[status]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Job List</TabsTrigger>
          <TabsTrigger value="create" disabled={accountStatus !== "approved"}>
            {editingJobId ? "Edit Job" : "Create Job"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>My Job Posts</CardTitle>
              <CardDescription>Manage your job postings and view applicants.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-500">Loading jobs...</p>
              ) : filteredJobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="font-medium text-slate-900">No jobs found</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create a job to start receiving applicants."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{job.positionTitle}</p>
                            <Badge variant={normalizeStatus(job) === "active" ? "default" : "outline"}>
                              {normalizeStatus(job)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {job.location} | {job.employmentType} {job.workType ? `| ${job.workType}` : ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            Created {formatDate(job.createdAt)}
                            {job.salaryMin && (
                              <span className="ml-2">
                                | PHP {Number(job.salaryMin).toLocaleString()}
                                {job.salaryMax && ` - ${Number(job.salaryMax).toLocaleString()}`} /{job.salaryPeriod}
                              </span>
                            )}
                          </p>
                          {normalizeStatus(job) === "rejected" && job.rejectionReason && (
                            <Alert className="mt-2 border-rose-200 bg-rose-50 py-2">
                              <AlertDescription className="text-xs text-rose-800">
                                <span className="font-bold">Revisions required:</span> {job.rejectionReason}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(job)}>
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchiveJob(job.id)}
                            disabled={archivingJobId === job.id}
                          >
                            <Archive className="mr-1 h-3 w-3" />
                            {archivingJobId === job.id ? "Archiving..." : "Archive"}
                          </Button>
                          <Link href={`/employer/jobs/${job.id}/applications`}>
                            <Button size="sm">
                              <Filter className="mr-1 h-3 w-3" />
                              View Applicants
                            </Button>
                          </Link>
                        </div>
                      </div>
                      {/* Manual status management removed - managed by admin moderation workflow */}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{editingJobId ? "Edit Job Posting" : "Create New Job Posting"}</CardTitle>
              <CardDescription>
                {editingJobId
                  ? "Changes will be reviewed by an administrator."
                  : "Submit for approval or save a draft to finish later."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitJob} className="space-y-6">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="positionTitle">Position title *</Label>
                    <Input
                      id="positionTitle"
                      value={editingJobId ? editForm.positionTitle : form.positionTitle}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, positionTitle: e.target.value }))
                          : setForm((p) => ({ ...p, positionTitle: e.target.value }))
                      }
                      placeholder="e.g. Senior Software Engineer"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Job description *</Label>
                    <Textarea
                      id="description"
                      value={editingJobId ? editForm.description : form.description}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, description: e.target.value }))
                          : setForm((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Describe the role, responsibilities, and requirements..."
                      className="min-h-24"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={editingJobId ? editForm.location : form.location}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, location: e.target.value }))
                          : setForm((p) => ({ ...p, location: e.target.value }))
                      }
                      placeholder="e.g. Purok 7, Brgy. Calumpang"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="municipality">Municipality</Label>
                    <Input
                      id="municipality"
                      value={editingJobId ? editForm.municipality : form.municipality}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, municipality: e.target.value }))
                          : setForm((p) => ({ ...p, municipality: e.target.value }))
                      }
                      placeholder="General Santos City"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={editingJobId ? editForm.province : form.province}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, province: e.target.value }))
                          : setForm((p) => ({ ...p, province: e.target.value }))
                      }
                      placeholder="South Cotabato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Work Setup</Label>
                    <Select
                      value={editingJobId ? editForm.employmentType : form.employmentType}
                      onValueChange={(v) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, employmentType: v }))
                          : setForm((p) => ({ ...p, employmentType: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select setup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workType">Work Type</Label>
                    <Select
                      value={(editingJobId ? editForm : form).workType || "Full-time"}
                      onValueChange={(v) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, workType: v }))
                          : setForm((p) => ({ ...p, workType: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SRS Form 2A Column 7 — Job Status (P/T/C) */}
                  <div className="space-y-2">
                    <Label htmlFor="employmentContractType">Job Status (SRS 2A Col. 7)</Label>
                    <Select
                      value={(editingJobId ? editForm : form).employmentContractType ?? "P"}
                      onValueChange={(v) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, employmentContractType: v as "P" | "T" | "C" }))
                          : setForm((p) => ({ ...p, employmentContractType: v as "P" | "T" | "C" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P">P — Permanent</SelectItem>
                        <SelectItem value="T">T — Temporary</SelectItem>
                        <SelectItem value="C">C — Contractual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Salary min (PHP)</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={editingJobId ? editForm.salaryMin : form.salaryMin}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, salaryMin: e.target.value }))
                          : setForm((p) => ({ ...p, salaryMin: e.target.value }))
                      }
                      placeholder="15000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Salary max (PHP)</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={editingJobId ? editForm.salaryMax : form.salaryMax}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, salaryMax: e.target.value }))
                          : setForm((p) => ({ ...p, salaryMax: e.target.value }))
                      }
                      placeholder="25000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryPeriod">Salary period</Label>
                    <Select
                      value={editingJobId ? editForm.salaryPeriod : form.salaryPeriod}
                      onValueChange={(v) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, salaryPeriod: v }))
                          : setForm((p) => ({ ...p, salaryPeriod: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mainSkillOrSpecialization">Main skills/specialization</Label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {(editingJobId ? editForm.mainSkillOrSpecialization : form.mainSkillOrSpecialization)
                          .split(",")
                          .filter(s => s.trim().length > 0)
                          .length} skills added
                      </span>
                    </div>
                    <SkillTagsInput
                      id="mainSkillOrSpecialization"
                      value={editingJobId ? editForm.mainSkillOrSpecialization : form.mainSkillOrSpecialization}
                      onChange={(val) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, mainSkillOrSpecialization: val }))
                          : setForm((p) => ({ ...p, mainSkillOrSpecialization: val }))
                      }
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">Press Enter or Comma to add a skill. These help in matching you with the right candidates.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimumEducationRequired">Minimum education</Label>
                    <Select
                      value={editingJobId ? editForm.minimumEducationRequired : form.minimumEducationRequired}
                      onValueChange={(v) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, minimumEducationRequired: v }))
                          : setForm((p) => ({ ...p, minimumEducationRequired: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select education" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperienceRequired">Years of experience</Label>
                    <Input
                      id="yearsOfExperienceRequired"
                      type="number"
                      value={editingJobId ? editForm.yearsOfExperienceRequired : form.yearsOfExperienceRequired}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, yearsOfExperienceRequired: e.target.value }))
                          : setForm((p) => ({ ...p, yearsOfExperienceRequired: e.target.value }))
                      }
                      placeholder="2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vacantPositions">Vacant positions *</Label>
                    <Input
                      id="vacantPositions"
                      type="number"
                      value={editingJobId ? editForm.vacantPositions : form.vacantPositions}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, vacantPositions: e.target.value }))
                          : setForm((p) => ({ ...p, vacantPositions: e.target.value }))
                      }
                      placeholder="5"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paidEmployees">Paid employees</Label>
                    <Input
                      id="paidEmployees"
                      type="number"
                      value={editingJobId ? editForm.paidEmployees : form.paidEmployees}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, paidEmployees: e.target.value }))
                          : setForm((p) => ({ ...p, paidEmployees: e.target.value }))
                      }
                      placeholder="10"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Industry codes (Select for this job)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {industryOptions.map((opt) => (
                        <label 
                          key={opt.code} 
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer text-[11px] transition-all ${
                            (editingJobId ? editForm.industryCodes : form.industryCodes).includes(opt.code)
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 hover:border-slate-400 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={(editingJobId ? editForm.industryCodes : form.industryCodes).includes(opt.code)}
                            onChange={(e) => {
                              const current = editingJobId ? editForm.industryCodes : form.industryCodes;
                              const updated = e.target.checked
                                ? [...current, opt.code]
                                : current.filter((c: string) => c !== opt.code);
                              if (editingJobId) {
                                setEditForm((p) => ({ ...p, industryCodes: updated }));
                              } else {
                                setForm((p) => ({ ...p, industryCodes: updated }));
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="font-bold shrink-0 w-6">{opt.code}</span>
                          <span className="leading-tight">{opt.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Prepared by information (for NSRP reporting)</Label>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        placeholder="Name"
                        value={editingJobId ? editForm.preparedByName : form.preparedByName}
                        onChange={(e) =>
                          editingJobId
                            ? setEditForm((p) => ({ ...p, preparedByName: e.target.value }))
                            : setForm((p) => ({ ...p, preparedByName: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Designation"
                        value={editingJobId ? editForm.preparedByDesignation : form.preparedByDesignation}
                        onChange={(e) =>
                          editingJobId
                            ? setEditForm((p) => ({ ...p, preparedByDesignation: e.target.value }))
                            : setForm((p) => ({ ...p, preparedByDesignation: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Contact"
                        value={editingJobId ? editForm.preparedByContact : form.preparedByContact}
                        onChange={(e) =>
                          editingJobId
                            ? setEditForm((p) => ({ ...p, preparedByContact: e.target.value }))
                            : setForm((p) => ({ ...p, preparedByContact: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Plus className="mr-2 h-4 w-4" />
                    {saving ? "Submitting..." : editingJobId ? "Update Job" : "Submit for Review"}
                  </Button>
                  {editingJobId ? (
                    <Button type="button" variant="ghost" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}