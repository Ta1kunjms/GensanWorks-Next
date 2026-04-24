"use client";

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
} from "lucide-react";
const industryNameMap: Record<string, string> = {
  "011": "Agriculture, Forestry and Fishing",
  "012": "Growing of Crops, Plant Propagation, Growing of Non-Perennial Crops",
  "013": "Growing of Perennial Crops",
  "014": "Plant Propagation and Related Activities",
  "015": "Animal Production and Related Activities",
  "016": "Support Activities to Agriculture",
  "017": "Hunting, Trapping and Related Activities",
  "021": "Silviculture and Other Forestry Activities",
  "022": "Logging",
  "023": "Gathering of Wild Non-Wood Forest Products",
  "024": "Support Services to Forestry",
  "031": "Fishing",
  "032": "Aquaculture",
  "101": "Mining of Coal and Lignite",
  "102": "Extraction of Crude Petroleum and Natural Gas",
  "103": "Mining of Metal Ores",
  "104": "Mining of Non-Metallic Minerals",
  "105": "Mining Support Service Activities",
  "141": "Quarrying of Stone, Sand and Clay",
  "142": "Mining and Quarrying NEC",
  "151": "Processing and Preserving of Meat",
  "152": "Processing and Preserving of Fish, Crustaceans and Mollusks",
  "153": "Manufacture of Grain Mill Products, Starches and Starch Products",
  "154": "Manufacture of Other Food Products",
  "155": "Manufacture of Beverages",
  "160": "Manufacture of Tobacco Products",
  "171": "Preparation and Spinning of Textile Fibres",
  "172": "Weaving of Textiles",
  "173": "Finishing of Textiles",
  "174": "Manufacture of Made-Up Textile Articles, Except Apparel",
  "175": "Manufacture of Knitted and Crocheted Fabrics and Articles",
  "181": "Manufacture of Wearing Apparel, Except Fur Apparel",
  "182": "Dressing and Dyeing of Fur, Manufacture of Articles of Fur",
  "191": "Tanning and Dressing of Leather, Luggage and Handbags",
  "192": "Manufacture of Footwear",
  "201": "Sawmilling and Planning of Wood",
  "202": "Manufacture of Wood-Based Products",
  "210": "Manufacture of Paper and Paper Products",
  "221": "Publishing",
  "222": "Printing and Service Activities Related to Printing",
  "223": "Reproduction of Recorded Media",
  "231": "Manufacture of Coke Oven Products",
  "232": "Manufacture of Refined Petroleum Products",
  "233": "Processing of Nuclear Fuel",
  "241": "Manufacture of Basic Chemicals",
  "242": "Manufacture of Other Chemical Products",
  "243": "Manufacture of Man-Made Fibres",
  "251": "Manufacture of Rubber Products",
  "252": "Manufacture of Plastics Products",
  "261": "Manufacture of Glass and Glass Products",
  "269": "Manufacture of Non-Metallic Mineral Products NEC",
  "271": "Manufacture of Basic Iron and Steel",
  "272": "Manufacture of Basic Precious and Other Non-Ferrous Metals",
  "273": "Casting of Metals",
  "281": "Manufacture of Structural Metal Products, Tanks and Steam Generators",
  "282": "Manufacture of Steam Generators, NRC",
  "291": "Manufacture of Machinery and Equipment",
  "292": "Manufacture of Weapons and Ammunition",
  "293": "Manufacture of Domestic Appliances",
  "300": "Manufacture of Office, Accounting and Computing Machinery",
  "311": "Manufacture of Electricity Generators",
  "312": "Manufacture of Electricity Distribution and Control Apparatus",
  "313": "Manufacture of Insulated Wire and Cable",
  "314": "Manufacture of Accumulators, Primary Cells and Primary Batteries",
  "315": "Manufacture of Lighting Equipment",
  "319": "Manufacture of Electrical Equipment NEC",
  "321": "Manufacture of Electronic Valves, Tubes and Integrated Circuits",
  "322": "Manufacture of Television and Radio Transmitters and Apparatus",
  "323": "Manufacture of Television and Radio Receivers",
  "331": "Manufacture of Medical and Surgical Equipment",
  "332": "Manufacture of Instruments and Appliances for Measuring",
  "333": "Manufacture of Industrial Process Control Equipment",
  "341": "Manufacture of Motor Vehicles",
  "342": "Manufacture of Bodies for Motor Vehicles",
  "343": "Manufacture of Parts and Accessories for Motor Vehicles",
  "351": "Building and Repairing of Ships and Boats",
  "352": "Manufacture of Railway and Tramway Locomotives",
  "353": "Manufacture of Aircraft and Spacecraft",
  "354": "Manufacture of Motorcycles and Bicycles",
  "359": "Manufacture of Transport Equipment NEC",
  "361": "Manufacture of Furniture",
  "369": "Manufacturing NEC",
  "371": "Recycling of Metal Waste and Scrap",
  "372": "Recycling of Non-Metal Waste and Scrap",
  "410": "Generation, Collection and Distribution of Electricity",
  "4101": "Electric Power Generation, Except Electric Power Plants",
  "4102": "Electric Power Transmission, Distribution and Sale",
  "4103": "Steam and Hot Water Supply",
  "420": "Collection, Purification and Distribution of Water",
  "450": "Construction",
  "451": "Site Preparation",
  "452": "Building of Complete Constructions or Parts Thereof",
  "453": "Building Installation",
  "454": "Building Completion",
  "455": "Renting of Construction or Demolition Equipment with Operator",
  "501": "Sale of Motor Vehicles",
  "502": "Maintenance and Repair of Motor Vehicles",
  "503": "Sale of Motor Vehicle Parts and Accessories",
  "504": "Sale, Maintenance and Repair of Motorcycles and Related Parts",
  "505": "Retail Sale of Automotive Fuel",
  "511": "Wholesale on a Fee or Contract Basis",
  "512": "Wholesale of Agricultural Raw Materials",
  "513": "Wholesale of Food, Beverages and Tobacco",
  "514": "Wholesale of Household Goods",
  "515": "Wholesale of Machinery, Equipment and Supplies",
  "516": "Wholesale of Other Household Equipment",
  "517": "Wholesale of Other Intermediate Products, Waste and Scrap",
  "521": "Non-Specialized Retail Trade",
  "522": "Retail Trade of Food, Beverages and Tobacco",
  "523": "Retail Trade of Pharmaceutical and Medical Goods",
  "524": "Retail Trade of Other Household Equipment",
  "525": "Retail Trade of Second-Hand Goods",
  "526": "Retail Trade Not in Stores",
  "551": "Restaurants and Bars",
  "552": "Caterings",
  "601": "Scheduled Interurban Bus Transport",
  "602": "Other Scheduled Land Transport",
  "603": "Taxi Operations",
  "604": "Other Land Transport via Other Motor Vehicle Types",
  "605": "Land Transport via Other Types of Transport",
  "611": "Sea and Coastal Water Transport",
  "612": "Inland Water Transport",
  "621": "Scheduled Air Transport",
  "622": "Non-Scheduled Air Transport",
  "623": "Space Transport",
  "631": "Cargo Handling",
  "632": "Storage and Warehousing",
  "633": "Supporting and Auxiliary Transport Activities",
  "634": "Activities of Travel Agencies and Tour Operators",
  "635": "Other Transport Agencies",
  "641": "National Post Activities",
  "642": "Courier Activities Other Than National Post",
  "651": "Banking",
  "659": "Other Financial Intermediation",
  "660": "Insurance and Pension Funding, Except Compulsory Social Security",
  "671": "Activities Auxiliary to Financial Intermediation",
  "672": "Activities Auxiliary to Insurance and Pension Funding",
  "701": "Real Estate Activities with Own or Leased Property",
  "702": "Real Estate Activities on a Fee or Contract Basis",
  "711": "Renting and Operational Leasing of Motor Vehicles",
  "712": "Renting and Operational Leasing of Other Transport Equipment",
  "713": "Renting and Operational Leasing of Other Machinery and Equipment",
  "714": "Renting and Leasing of Personal and Household Goods",
  "721": "Legal, Accounting, Bookkeeping and Auditing Activities",
  "722": "Tax Consultancy",
  "723": "Market Research and Public Opinion Polling",
  "724": "Business and Management Consultancy Activities",
  "725": "Architectural and Engineering Activities",
  "726": "Testing and Analysis",
  "731": "Research and Experimental Development on Natural Sciences",
  "732": "Research and Experimental Development on Social Sciences",
  "741": "Activities of Business, Employers and Professional Organizations",
  "742": "Industrial Design Activities",
  "743": "Packaging Activities",
  "744": "Packaging Activities",
  "749": "Business Services NEC",
  "751": "Public Administration",
  "752": "Public Administration and Defense",
  "753": "Compulsory Social Security Activities",
  "801": "Primary Education",
  "802": "Secondary Education",
  "803": "Higher Education",
  "809": "Education NEC",
  "851": "Human Health Activities",
  "852": "Veterinary Activities",
  "853": "Social Work Activities",
  "900": "Sewage and Refuse Disposal",
  "911": "Activities of Business, Employers and Professional Organizations",
  "912": "Activities of Trade Unions",
  "913": "Religious Organizations",
  "914": "Activities of Other Membership Organizations",
  "921": "Film and Video Production",
  "922": "Film and Video Distribution",
  "923": "Film Projection",
  "924": "Radio and Television Activities",
  "925": "Other Entertainment Activities",
  "926": "News Agency Activities",
  "929": "Other Recreational Activities",
  "930": "Sport and Other Recreational Activities",
};

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
  "Vocational Graduate",
  "Technical Graduate",
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
  agePreference?: string;
  vacantPositions?: string;
  paidEmployees?: string;
  industryCodes: string[] | null;
  status: "draft" | "pending" | "active" | "closed" | "archived" | null;
  jobStatus?: string;
  jobStatusPTC?: string;
  isPublished: boolean;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
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
  const raw = String(job.status ?? job.jobStatus ?? job.jobStatusPTC ?? "").toLowerCase();
  if (job.archived) return "archived";
  if (raw === "approved" || raw === "active") return "active";
  if (raw === "rejected" || raw === "needs_changes") return "rejected";
  if (raw === "draft") return "draft";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const buildInitialForm = () => ({
  positionTitle: "",
  description: "",
  location: "",
  barangay: "",
  municipality: "General Santos City",
  province: "South Cotabato",
  employmentType: "Full-time",
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: "monthly",
  mainSkillOrSpecialization: "",
  mainSkillDesired: "",
  minimumEducationRequired: "",
  yearsOfExperienceRequired: "",
  agePreference: "",
  agePreferenceMin: "",
  agePreferenceMax: "",
  vacantPositions: "1",
  vacancies: "1",
  paidEmployees: "",
  industryCodes: [] as string[],
  jobStatus: "P",
  preparedByName: "",
  preparedByDesignation: "",
  preparedByContact: "",
  startingSalary: "",
  deadline: "",
});

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

  const industryOptions = useMemo(
    () =>
      Object.entries(industryNameMap)
        .map(([code, name]) => ({ code, name }))
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
        agePreferenceMin: (source as any).agePreferenceMin ? Number((source as any).agePreferenceMin) : undefined,
        agePreferenceMax: (source as any).agePreferenceMax ? Number((source as any).agePreferenceMax) : undefined,
        startingSalary: (source as any).startingSalary ? Number((source as any).startingSalary) : (source as any).salaryMin ? Number((source as any).salaryMin) : undefined,
        vacancies: Number((source as any).vacancies || (source as any).vacantPositions) || 1,
        location: source.location.trim() || undefined,
        employmentType: (source as any).employmentType || (source as any).jobStatus || "P",
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
      agePreference: job.agePreference || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agePreferenceMin: String((job as any).agePreferenceMin ?? ""),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agePreferenceMax: String((job as any).agePreferenceMax ?? ""),
      vacantPositions: String(job.vacantPositions || "1"),
      vacancies: String(job.vacantPositions || "1"),
      paidEmployees: String(job.paidEmployees || ""),
      industryCodes: Array.isArray(job.industryCodes) ? job.industryCodes : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jobStatus: (job as any).jobStatus ?? "P",
      preparedByName: job.preparedByName || "",
      preparedByDesignation: job.preparedByDesignation || "",
      preparedByContact: job.preparedByContact || "",
      startingSalary: String(job.salaryMin || ""),
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
            onClick={() => {
              if (showForm) {
                cancelEditing();
              } else {
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
              <Badge variant={statusFilter === status ? "default" : "outline"}>
                {status === "active" ? (statusBuckets.active + statusBuckets.pending) : statusBuckets[status]}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Job List</TabsTrigger>
          <TabsTrigger value="create">{editingJobId ? "Edit Job" : "Create Job"}</TabsTrigger>
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
                            {job.location} · {job.employmentType}
                          </p>
                          <p className="text-xs text-slate-500">
                            Created {formatDate(job.createdAt)}
                            {job.salaryMin && (
                              <span className="ml-2">
                                · PHP {Number(job.salaryMin).toLocaleString()}
                                {job.salaryMax && ` - ${Number(job.salaryMax).toLocaleString()}`} /{job.salaryPeriod}
                              </span>
                            )}
                          </p>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                          <Link href={`/employer/jobs/${job.id}/applications`}>
                            <Button size="sm">
                              <Filter className="mr-1 h-3 w-3" />
                              View Applicants
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={normalizeStatus(job) === status ? "default" : "outline"}
                            onClick={() => updateStatus(job.id, status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
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
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
                )}

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
                    <Label htmlFor="employmentType">Employment type</Label>
                    <Select
                      value={editingJobId ? editForm.jobStatus : form.jobStatus}
                      onValueChange={(v) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, jobStatus: v }))
                          : setForm((p) => ({ ...p, jobStatus: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P">Pending Approval</SelectItem>
                        <SelectItem value="A">Active</SelectItem>
                        <SelectItem value="D">Draft</SelectItem>
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
                    <Label htmlFor="mainSkillOrSpecialization">Main skill/specialization</Label>
                    <Input
                      id="mainSkillOrSpecialization"
                      value={editingJobId ? editForm.mainSkillOrSpecialization : form.mainSkillOrSpecialization}
                      onChange={(e) =>
                        editingJobId
                          ? setEditForm((p) => ({ ...p, mainSkillOrSpecialization: e.target.value }))
                          : setForm((p) => ({ ...p, mainSkillOrSpecialization: e.target.value }))
                      }
                      placeholder="e.g. Computer Programming"
                    />
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
                    <Label>Industry codes</Label>
                    <div className="flex flex-wrap gap-2">
                      {industryOptions.slice(0, 20).map((opt) => (
                        <label key={opt.code} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                          <input
                            type="checkbox"
                            checked={(editingJobId ? editForm.industryCodes : form.industryCodes).includes(opt.code)}
                            onChange={(e) => {
                              const current = editingJobId ? editForm.industryCodes : form.industryCodes;
                              const updated = e.target.checked
                                ? [...current, opt.code]
                                : current.filter((c) => c !== opt.code);
                              if (editingJobId) {
                                setEditForm((p) => ({ ...p, industryCodes: updated }));
                              } else {
                                setForm((p) => ({ ...p, industryCodes: updated }));
                              }
                            }}
                            className="mr-1"
                          />
                          {opt.code}
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
                  {editingJobId && (
                    <Button type="button" variant="ghost" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}