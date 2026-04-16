"use client";

/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages, react/no-unescaped-entities */

import { useEffect, useRef, useState } from "react";
import type { ElementType, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, 
  Users, 
  Building2, 
  CheckCircle2, 
  Search,
  FileText,
  UserCheck,
  Award,
  Shield,
  Clock,
  MapPin,
  ChevronRight,
  Star,
  Target,
  Zap,
  Globe,
  TrendingUp,
  BarChart3,
  HelpCircle,
  Laptop,
  Smartphone,
  HeadphonesIcon,
  GraduationCap,
  Wrench,
  Stethoscope,
  Code,
  TrendingDown,
  ArrowUpRight,
  Bell,
  Video,
  Download,
  Play
} from "lucide-react";

interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  aboutTitle: string;
  aboutBody: string;
  heroBackgroundImage: string;
  seoKeywords: string;
}

interface SummaryMetric {
  value: number;
}

interface SummaryData {
  totalApplicants: SummaryMetric;
  activeEmployers: SummaryMetric;
  successfulReferrals: SummaryMetric;
}

interface ImpactMetrics {
  avgTimeToInterview: string;
  avgSalary: string;
  satisfactionRate: string;
  yearsOfService: number;
}

type Partner = {
  name: string;
  tagline: string;
  icon: ElementType;
};

const industryPartners: Partner[] = [
  { name: "General Milling Corp", tagline: "Food Manufacturing", icon: Building2 },
  { name: "SM City General Santos", tagline: "Retail & Lifestyle", icon: Briefcase },
  { name: "Dole Philippines", tagline: "Agri & Export", icon: Globe },
  { name: "Gaisano Mall", tagline: "Shopping & Leisure", icon: Star },
  { name: "Robinsons Place", tagline: "Retail Group", icon: Target },
  { name: "KCC Mall", tagline: "Regional Retail", icon: TrendingUp },
  { name: "Mindanao Tech Hub", tagline: "Technology Park", icon: Laptop },
  { name: "South Cotabato Steelworks", tagline: "Industrial & Steel", icon: Wrench },
  { name: "SOCCSKSARGEN Medical", tagline: "Healthcare Network", icon: Stethoscope },
  { name: "Pioneer Contact Center", tagline: "BPO & Support", icon: HeadphonesIcon },
];

const heroBadgePhrases = [
  {
    title: "Smart Matching",
    description: "AI-assisted recommendations tuned by PESO counselors",
  },
  {
    title: "Verified Employers",
    description: "Every company undergoes compliance screening",
  },
  {
    title: "Lightning Placement",
    description: "Interviews arranged within 48 hours on average",
  },
];

const heroHighlights: Array<{
  title: string;
  detail: string;
  icon: ElementType;
  accent: string;
}> = [
  { title: "48h Interview Rate", detail: "Candidates hear back within two days", icon: Clock, accent: "bg-blue-100 text-blue-700" },
  { title: "100% Verified", detail: "No fake job posts or ghost employers", icon: Shield, accent: "bg-slate-200 text-slate-700" },
  { title: "AI + PESO", detail: "Hybrid review ensures better matches", icon: Zap, accent: "bg-blue-50 text-blue-700" },
  { title: "Regional Reach", detail: "Nationwide jobs curated for GenSan", icon: Globe, accent: "bg-slate-100 text-slate-700" },
];

const defaultGeneralSettings: GeneralSettings = {
  siteName: "GensanWorks",
  siteDescription: "Official Job Assistance Platform of PESO – General Santos City",
  contactEmail: "admin@gensanworks.com",
  contactPhone: "+63 283 889 5200",
  address: "General Santos City, South Cotabato",
  heroHeadline: "Connecting jobseekers and employers in General Santos City",
  heroSubheadline: "A single window for opportunities, referrals, and PESO services",
  primaryCTA: "Browse Jobs",
  secondaryCTA: "Post a Vacancy",
  aboutTitle: "Why GensanWorks",
  aboutBody: "PESO-led platform for job matching, referrals, and analytics across the city.",
  heroBackgroundImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80",
  seoKeywords: "peso gensan jobs, job portal gensan, peso referrals",
};

const ensureMetaTag = (name: string, content: string) => {
  if (!content) return;
  const existing = document.querySelector(`meta[name="${name}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }
  const tag = document.createElement("meta");
  tag.setAttribute("name", name);
  tag.setAttribute("content", content);
  document.head.appendChild(tag);
};

const ensureMetaProperty = (property: string, content: string) => {
  if (!content) return;
  const existing = document.querySelector(`meta[property="${property}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }
  const tag = document.createElement("meta");
  tag.setAttribute("property", property);
  tag.setAttribute("content", content);
  document.head.appendChild(tag);
};

const experienceHighlights: Array<{
  title: string;
  description: string;
  icon: ElementType;
}> = [
  { title: "Responsive Everywhere", description: "Desktop, tablet, or mobile—continue applications seamlessly.", icon: Smartphone },
  { title: "Career Coaching", description: "PESO counselors help polish resumes and prep interviews.", icon: GraduationCap },
  { title: "Human + AI Support", description: "Automations handle busywork while people focus on you.", icon: HeadphonesIcon },
  { title: "Skills Mapping", description: "Match certificates and NCII levels with in-demand roles instantly.", icon: FileText },
];

const ctaHighlights: Array<{ label: string; value: string; icon: ElementType }> = [
  { label: "Job Alerts", value: "Instant", icon: Bell },
  { label: "Talent Pool", value: "30k+", icon: Users },
  { label: "Interview Prep", value: "Guided", icon: Video },
];

const trustSignals: Array<{ title: string; description: string; icon: ElementType; accent: string }> = [
  { title: "Government Certified", description: "Official PESO platform", icon: Shield, accent: "bg-blue-50 text-blue-600" },
  { title: "Data Protected", description: "Secure by design", icon: CheckCircle2, accent: "bg-blue-50 text-blue-600" },
  { title: "Service Excellence", description: "ISO-aligned workflows", icon: Award, accent: "bg-slate-100 text-slate-600" },
];

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const previousRef = useRef(0);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const initial = previousRef.current;
    const difference = target - initial;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(initial + difference * progress);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    previousRef.current = target;
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return Math.max(0, Math.round(value));
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const [heroBadgeIndex, setHeroBadgeIndex] = useState(0);
  const partnerMarqueeItems = [...industryPartners, ...industryPartners];
  const activeHeroBadge = heroBadgePhrases[heroBadgeIndex] ?? heroBadgePhrases[0];

  const { data: generalSettingsData } = useQuery<GeneralSettings>({
    queryKey: ["settings", "general", "public"],
    queryFn: async () => {
      const response = await fetch("/api/settings/general/public");
      if (!response.ok) throw new Error("Failed to fetch general settings");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const generalSettings = generalSettingsData ?? defaultGeneralSettings;

  useEffect(() => {
    document.title = `${generalSettings.siteName} — ${generalSettings.siteDescription}`;
    ensureMetaTag("description", generalSettings.siteDescription);
    ensureMetaTag("keywords", generalSettings.seoKeywords);
    const url = typeof window !== "undefined" ? window.location.href : "";
    ensureMetaProperty("og:title", generalSettings.siteName);
    ensureMetaProperty("og:description", generalSettings.siteDescription);
    ensureMetaProperty("og:image", generalSettings.heroBackgroundImage);
    ensureMetaProperty("og:url", url);
    ensureMetaProperty("twitter:card", "summary_large_image");
    ensureMetaProperty("twitter:title", generalSettings.siteName);
    ensureMetaProperty("twitter:description", generalSettings.siteDescription);
    ensureMetaProperty("twitter:image", generalSettings.heroBackgroundImage);
    ensureMetaProperty("twitter:url", url);
  }, [generalSettings]);

  const { data: summaryData, isLoading } = useQuery<SummaryData>({
    queryKey: ["landing", "summary"],
    queryFn: async () => {
      const response = await fetch("/api/summary");
      if (!response.ok) throw new Error("Failed to fetch summary data");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: impactData, isLoading: impactLoading } = useQuery<ImpactMetrics>({
    queryKey: ["landing", "impact"],
    queryFn: async () => {
      const response = await fetch("/api/public/impact");
      if (!response.ok) throw new Error("Failed to fetch impact data");
      return response.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const animatedJobseekers = useAnimatedNumber(summaryData?.totalApplicants.value ?? 0);
  const animatedEmployers = useAnimatedNumber(summaryData?.activeEmployers.value ?? 0);
  const animatedMatches = useAnimatedNumber(summaryData?.successfulReferrals.value ?? 0);

  useEffect(() => {
    const badgeTimer = setInterval(() => {
      setHeroBadgeIndex((prev) => (prev + 1) % heroBadgePhrases.length);
    }, 12000);
    return () => clearInterval(badgeTimer);
  }, []);

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["summary"],
      queryFn: async () => {
        const res = await fetch("/api/summary");
        if (!res.ok) throw new Error("Failed to fetch /api/summary");
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  const heroStats = [
    { label: "Active Jobseekers", value: animatedJobseekers, description: "Profiles verified this quarter" },
    { label: "Partner Employers", value: animatedEmployers, description: "Business owners hiring now" },
    { label: "Jobs Matched", value: animatedMatches, description: "Successful placements to date" },
  ];

  const stats = {
    jobseekersRegistered: summaryData?.totalApplicants.value ?? 0,
    employersParticipating: summaryData?.activeEmployers.value ?? 0,
    jobsMatched: summaryData?.successfulReferrals.value ?? 0,
  };

  const skillsLoading = isLoading;
  const skillsData = [
    { skill: "Customer Support", percentage: 92 },
    { skill: "Digital Marketing", percentage: 88 },
    { skill: "Accounting", percentage: 84 },
    { skill: "Front-End Development", percentage: 81 },
    { skill: "Healthcare Assistance", percentage: 79 },
    { skill: "Logistics Management", percentage: 75 },
    { skill: "Sales Strategy", percentage: 73 },
    { skill: "Technical Support", percentage: 69 },
  ];

  type ExpectedSkillsShortage = {
    skillCluster: string;
    projectedGap: string;
    timeframe: string;
    driver: string;
    focus: string;
  };

  const expectedSkillsShortage: ExpectedSkillsShortage[] = [
    {
      skillCluster: "AI-ready Developers",
      projectedGap: "300 roles",
      timeframe: "Q1–Q3 2025",
      driver: "Fintech and logistics platforms rolling out automation",
      focus: "Full stack + data pipeline",
    },
    {
      skillCluster: "Healthcare Support",
      projectedGap: "220 roles",
      timeframe: "Next 12 months",
      driver: "Regional hospital expansion and aging population",
      focus: "Patient care + inventory",
    },
    {
      skillCluster: "Certified Welders",
      projectedGap: "180 roles",
      timeframe: "Before new export hub opens",
      driver: "Fabrication contracts in SOCCSKSARGEN",
      focus: "NC II + safety compliance",
    },
    {
      skillCluster: "CX Specialists",
      projectedGap: "150 roles",
      timeframe: "Next 2 quarters",
      driver: "BPO providers scaling GenSan pods",
      focus: "Omnichannel support",
    },
  ];

  const shortageInitiatives = [
    {
      title: "Scholarship Slots",
      description: "Allocate 120 TESDA-backed seats for AI and automation tracks.",
      owner: "PESO + TESDA",
    },
    {
      title: "Employer Bootcamps",
      description: "Run joint clinics with hospitals and steelworks to co-design training.",
      owner: "Industry Desk",
    },
    {
      title: "CX Career Sprint",
      description: "Two-week finishing course to convert hospitality workers into CX hires.",
      owner: "Job Center",
    },
  ];

  const formatNumber = (num: number) => num.toLocaleString();

  const handleNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Thank you for subscribing to our newsletter!");
    setEmail("");
  };

  const faqs = [
    {
      question: "How do I register as a jobseeker on GensanWorks?",
      answer: "Click on 'Sign Up' or 'Get Started' button, fill in your personal information, upload your resume, and complete your profile. Registration is completely free for jobseekers. You'll need a valid email address and government-issued ID for verification."
    },
    {
      question: "Is there a fee to use GensanWorks?",
      answer: "No, GensanWorks is completely free for jobseekers. You can create profiles, search for jobs, apply to unlimited positions, and access career resources at no cost. Employers may have different service packages for premium features."
    },
    {
      question: "How can employers post job vacancies?",
      answer: "Employers need to register for an employer account, verify their company information with PESO, and then they can post unlimited job vacancies through the employer portal. The verification process ensures all job postings are legitimate and from verified companies."
    },
    {
      question: "What documents do I need to upload?",
      answer: "At minimum, upload your resume/CV. Additional documents like educational certificates, diplomas, professional licenses, NCII certifications, and employment records will strengthen your profile and increase your chances of being matched with quality jobs."
    },
    {
      question: "How does the AI-powered job matching system work?",
      answer: "Our intelligent matching system analyzes your skills, work experience, education level, location preferences, and salary expectations to recommend jobs that best match your profile. You'll receive instant notifications when new matching opportunities are posted. The more complete your profile, the better the matches."
    },
    {
      question: "Can I apply for jobs outside General Santos City?",
      answer: "Yes! While we focus on General Santos City opportunities, our platform also features jobs from across SOCCSKSARGEN region and nationwide. You can set your location preferences in your profile to control which job opportunities you see."
    },
    {
      question: "How long does it take to get hired?",
      answer: "Based on our data, most candidates receive their first interview invitation within 48 hours of application. The average time from application to job offer is 2-3 weeks, depending on the position and industry. Our streamlined process helps speed up hiring."
    },
    {
      question: "What makes GensanWorks different from other job platforms?",
      answer: "GensanWorks is the official PESO platform, meaning all employers and jobs are verified by the government. We offer AI-powered matching, direct employer communication, career guidance programs, and local support from PESO staff. Plus, it's completely free for jobseekers with no hidden charges."
    }
  ];

  const skillColorClasses = [
    { text: "text-blue-600", bar: "from-blue-500 to-blue-600" },
    { text: "text-blue-700", bar: "from-blue-600 to-blue-700" },
    { text: "text-slate-600", bar: "from-slate-500 to-slate-600" },
    { text: "text-blue-600", bar: "from-blue-500 to-blue-600" },
    { text: "text-slate-700", bar: "from-slate-600 to-slate-700" },
    { text: "text-blue-700", bar: "from-blue-600 to-blue-700" },
    { text: "text-slate-600", bar: "from-slate-500 to-slate-600" },
    { text: "text-blue-600", bar: "from-blue-500 to-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation Header - Clean and minimal */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <a href="/" className="flex items-center gap-3 cursor-pointer group">
              <img src="/peso-gsc-logo.png" alt="PESO GSC" className="h-11 w-11 transition-transform group-hover:scale-105 duration-200" />
              <div className="flex flex-col">
                <span className="font-semibold text-lg text-slate-900 tracking-tight">GensanWorks</span>
                <span className="text-xs text-slate-500">Public Employment Service Office</span>
              </div>
            </a>
            <nav className="hidden lg:flex items-center gap-1">
              <a href="/#services" className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium">Services</a>
              <a href="/#how-it-works" className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium">How It Works</a>
              <a href="/about" className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium">About</a>
              <a href="/contact" className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-sm font-medium">Contact</a>
              <div className="flex items-center gap-2 ml-6 pl-6 border-l border-slate-200">
                <a href="/login?role=jobseeker"><Button variant="ghost" className="font-medium text-sm">Login</Button></a>
                <a href="/signup/jobseeker"><Button className="font-medium text-sm bg-blue-600 hover:bg-blue-700">Get Started</Button></a>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: generalSettings.heroBackgroundImage ? `url('${generalSettings.heroBackgroundImage}')` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-32 w-96 h-96 bg-blue-200/20 blur-3xl rounded-full spin-slow" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-slate-200/15 blur-3xl rounded-full spin-slower" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-spacious">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 eyebrow text-slate-700 shadow-sm reveal-up">
                <span>{generalSettings.siteName}</span>
                <span className="text-blue-700 font-bold">{activeHeroBadge?.title ?? "Smart Matching"}</span>
              </div>

              <h1 className="display-title font-display max-w-4xl reveal-up delay-1">
                {generalSettings.heroHeadline}
              </h1>

              <p className="section-copy max-w-2xl reveal-up delay-2">
                {generalSettings.heroSubheadline}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 reveal-up delay-3">
                {heroHighlights.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="rounded-lg border border-slate-200 bg-white/80 interactive-card p-4 flex items-start gap-3 hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <div className={`icon-chip-sm ${highlight.accent}`}>
                      <highlight.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{highlight.title}</p>
                      <p className="text-xs text-slate-600">{highlight.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2 reveal-up delay-3">
                <a href="/jobseeker/jobs" className="flex-1 sm:flex-initial">
                  <Button size="lg" className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 px-8 py-6 text-base font-semibold shadow-md hover:shadow-lg transition-all">
                    {generalSettings.primaryCTA}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <a href="/employer/jobs" className="flex-1 sm:flex-initial">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 border-slate-300 bg-white px-8 py-6 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-all">
                    {generalSettings.secondaryCTA}
                  </Button>
                </a>
              </div>

              <p className="text-sm text-slate-500">
                Need quick access? <a href="/login?role=jobseeker" className="font-semibold text-blue-600 hover:underline">Jobseeker Login</a> · <a href="/login?role=employer" className="font-semibold text-blue-600 hover:underline">Employer Login</a>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 reveal-up delay-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="surface-subtle p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{stat.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mb-1" />
                    ) : (
                      <p className="text-3xl font-bold text-slate-900">{formatNumber(stat.value)}+</p>
                    )}
                    <p className="text-xs text-slate-500">{stat.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative reveal-up delay-2">
              <div className="relative bg-white border border-slate-200 rounded-hero p-8 shadow-lg overflow-hidden min-h-[420px]">
                <div className="relative space-y-6">
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Interview Speed</p>
                      <p className="text-4xl font-bold text-slate-900 mt-1">
                        {impactLoading ? <Skeleton className="h-10 w-32" /> : impactData?.avgTimeToInterview || '48 hrs'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Average time to first interview</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md">
                      <Zap className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Placements</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-slate-900">
                        {isLoading ? <Skeleton className="h-10 w-28" /> : formatNumber(Math.max(animatedMatches, 0))}
                      </p>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-semibold">Realtime</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Successful placements tracked</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="rounded-lg bg-blue-700 text-white p-4">
                      <p className="text-xs uppercase tracking-wide text-blue-100 font-semibold">Satisfaction</p>
                      <p className="text-3xl font-bold mt-1">
                        {impactLoading ? <Skeleton className="h-8 w-20 bg-blue-600" /> : impactData?.satisfactionRate || "94.5%"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-100 text-slate-900 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold">Avg Salary</p>
                      <p className="text-3xl font-bold mt-1">
                        {impactLoading ? <Skeleton className="h-8 w-20" /> : impactData?.avgSalary || "₱32.5K"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust + Partners */}
      <section className="relative w-full bg-white border-b border-slate-100 section-dense">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {trustSignals.map((signal) => (
              <div key={signal.title} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm hover:shadow-md transition-shadow">
                <div className={`icon-chip-sm ${signal.accent}`}>
                  <signal.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                  <p className="text-xs text-slate-600">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="eyebrow text-slate-500 mb-3">Trusted by Regional Employers</p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Partner network expanding weekly</h2>
          </div>

          <div className="overflow-hidden">
            <div className="flex gap-4 brand-marquee" aria-hidden="true">
              {partnerMarqueeItems.map((partner, index) => (
                <div key={`${partner.name}-${index}`} className="min-w-[220px] surface-card interactive-card px-5 py-4 flex items-center gap-3 shadow-sm">
                  <div className="icon-chip-sm bg-slate-100">
                    <partner.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
                    <p className="text-xs text-slate-500">{partner.tagline}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section id="how-it-works" className="w-full section-normal bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4">How GensanWorks Works for You</h2>
            <p className="section-copy max-w-2xl mx-auto">
              Three guided steps, from profile setup to interviews, designed to move you from searching to hired.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="surface-card interactive-card p-8 h-full">
                <div className="icon-chip bg-blue-100 mb-6">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div className="absolute top-6 right-6 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Create Your Profile</h3>
                <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                  Sign up and build your professional profile with your skills, experience, and career goals.
                </p>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Upload resume and certificates</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Highlight your skills</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Set job preferences</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="relative">
              <div className="surface-card interactive-card p-8 h-full">
                <div className="icon-chip bg-slate-100 mb-6">
                  <Search className="w-6 h-6 text-slate-700" />
                </div>
                <div className="absolute top-6 right-6 w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Search & Apply</h3>
                <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                  Browse thousands of job opportunities and apply with one click using your profile.
                </p>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Advanced search filters</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">AI-powered job matching</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Track application status</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="relative">
              <div className="surface-card interactive-card p-8 h-full">
                <div className="icon-chip bg-blue-50 mb-6">
                  <Briefcase className="w-6 h-6 text-blue-700" />
                </div>
                <div className="absolute top-6 right-6 w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Get Hired</h3>
                <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                  Receive interview invitations, connect with employers, and land your dream job.
                </p>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Direct employer communication</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Interview scheduling</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">Job offer management</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Layer */}
      <section className="relative w-full bg-slate-900 text-white section-normal overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 right-0 w-64 h-64 bg-blue-500 blur-[80px]" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-slate-400 blur-[96px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
            <div className="space-y-6">
              <p className="eyebrow text-blue-200">Experience</p>
              <h2 className="section-title text-white">
                Human guidance meets automation for every jobseeker and employer.
              </h2>
              <p className="section-copy text-slate-200">
                Orientation sessions, coaching, and mobile responsiveness make the platform feel bespoke. Everything is designed so you can start applications at City Hall, continue on your phone, and finish at home.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/contact">
                  <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-5 text-sm font-semibold">
                    Schedule Orientation
                  </Button>
                </a>
                <a href="/help">
                  <Button variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10 px-6 py-5 text-sm font-semibold">
                    See Support Programs
                  </Button>
                </a>
              </div>
              <div className="inline-flex items-center gap-4 rounded-card border border-white/20 bg-white/5 px-5 py-3">
                <div className="icon-chip-sm bg-white/15">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Serving General Santos for {impactLoading ? '25+' : `${impactData?.yearsOfService || 25}+`} years</p>
                  <p className="text-xs text-slate-200">Generational employment support</p>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {experienceHighlights.map((item) => (
                <div key={item.title} className="rounded-card bg-white/5 border border-white/15 p-5 transition-colors hover:bg-white/10">
                  <div className="icon-chip-sm bg-white/10 mb-4">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-lg mb-1">{item.title}</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Employment Services */}
      <section id="services" className="w-full bg-white section-normal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title mb-3">Employment Services, End to End</h2>
            <p className="section-copy max-w-2xl mx-auto">
              One platform for jobseekers and employers to post, apply, train, and hire with confidence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="/jobseeker/jobs" className="group surface-card interactive-card p-6 cursor-pointer border-l-4 border-l-blue-600">
              <div className="icon-chip bg-blue-100 mb-5 group-hover:bg-blue-600 transition-all">
                <Search className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Job Search Portal</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Browse thousands of verified job opportunities across various industries.
              </p>
              <span className="text-sm text-blue-700 font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore Jobs <ChevronRight className="w-4 h-4" />
              </span>
            </a>
            
            <a href="/employer/jobs" className="group surface-card interactive-card p-6 cursor-pointer border-l-4 border-l-slate-700">
              <div className="icon-chip bg-slate-100 mb-5 group-hover:bg-slate-700 transition-all">
                <FileText className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Post Job Vacancies</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Reach qualified candidates quickly with our streamlined posting system.
              </p>
              <span className="text-sm text-slate-700 font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Post a Job <ChevronRight className="w-4 h-4" />
              </span>
            </a>
            
            <a href="/help" className="group surface-card interactive-card p-6 cursor-pointer border-l-4 border-l-blue-700">
              <div className="icon-chip bg-blue-50 mb-5 group-hover:bg-blue-700 transition-all">
                <Target className="w-6 h-6 text-blue-700 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Career Development</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Access training programs, workshops, and professional development resources.
              </p>
              <span className="text-sm text-blue-700 font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Learn More <ChevronRight className="w-4 h-4" />
              </span>
            </a>
            
            <a href="/contact" className="group surface-card interactive-card p-6 cursor-pointer border-l-4 border-l-slate-700">
              <div className="icon-chip bg-slate-100 mb-5 group-hover:bg-slate-700 transition-all">
                <Users className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Job Fairs & Events</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Participate in career fairs, recruitment drives, and networking events.
              </p>
              <span className="text-sm text-slate-700 font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                View Events <ChevronRight className="w-4 h-4" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Browse by Job Category */}
      <section className="w-full bg-slate-50 section-normal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title mb-3">Explore Jobs by Category</h2>
            <p className="section-copy max-w-2xl mx-auto">
              Jump directly into sectors that match your background and goals.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <a href="/jobseeker/jobs?category=technology" className="group surface-card interactive-card p-5 hover:border-blue-200">
              <div className="icon-chip-sm bg-blue-50 mb-3 group-hover:bg-blue-100 transition-colors">
                <Code className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Technology & IT</h3>
              <p className="text-xs text-slate-500 mb-2">2,341 jobs available</p>
              <span className="text-xs text-blue-600 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs?category=healthcare" className="group surface-card interactive-card p-5 hover:border-blue-200">
              <div className="icon-chip-sm bg-blue-50 mb-3 group-hover:bg-blue-100 transition-colors">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Healthcare</h3>
              <p className="text-xs text-slate-500 mb-2">1,876 jobs available</p>
              <span className="text-xs text-blue-600 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs?category=education" className="group surface-card interactive-card p-5 hover:border-slate-300">
              <div className="icon-chip-sm bg-slate-100 mb-3 group-hover:bg-slate-200 transition-colors">
                <GraduationCap className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Education</h3>
              <p className="text-xs text-slate-500 mb-2">1,432 jobs available</p>
              <span className="text-xs text-slate-700 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs?category=engineering" className="group surface-card interactive-card p-5 hover:border-slate-300">
              <div className="icon-chip-sm bg-slate-100 mb-3 group-hover:bg-slate-200 transition-colors">
                <Wrench className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Engineering</h3>
              <p className="text-xs text-slate-500 mb-2">1,098 jobs available</p>
              <span className="text-xs text-slate-700 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs?category=customer-service" className="group surface-card interactive-card p-5 hover:border-blue-200">
              <div className="icon-chip-sm bg-blue-50 mb-3 group-hover:bg-blue-100 transition-colors">
                <HeadphonesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Customer Service</h3>
              <p className="text-xs text-slate-500 mb-2">987 jobs available</p>
              <span className="text-xs text-blue-600 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs?category=sales" className="group surface-card interactive-card p-5 hover:border-blue-200">
              <div className="icon-chip-sm bg-blue-50 mb-3 group-hover:bg-blue-100 transition-colors">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Sales & Marketing</h3>
              <p className="text-xs text-slate-500 mb-2">1,654 jobs available</p>
              <span className="text-xs text-blue-600 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs?category=admin" className="group surface-card interactive-card p-5 hover:border-slate-300">
              <div className="icon-chip-sm bg-slate-100 mb-3 group-hover:bg-slate-200 transition-colors">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Admin & Office</h3>
              <p className="text-xs text-slate-500 mb-2">1,234 jobs available</p>
              <span className="text-xs text-slate-700 font-medium inline-flex items-center gap-0.5">
                View Jobs <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>

            <a href="/jobseeker/jobs" className="group surface-card interactive-card p-5 border-slate-300 hover:border-slate-400">
              <div className="icon-chip-sm bg-slate-100 mb-3 group-hover:bg-slate-200 transition-colors">
                <Search className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">All Categories</h3>
              <p className="text-xs text-slate-500 mb-2">10,000+ jobs available</p>
              <span className="text-xs text-slate-700 font-medium inline-flex items-center gap-0.5">
                Browse All <ArrowUpRight className="w-3 h-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="w-full bg-white section-normal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="section-title mb-5">
                {generalSettings.aboutTitle}
              </h2>
              <p className="section-copy mb-8">
                {generalSettings.aboutBody}
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">AI-Powered Matching</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Our intelligent system matches jobseekers with relevant opportunities based on skills, experience, and preferences.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="icon-chip bg-slate-100 flex-shrink-0">
                    <Shield className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Verified & Secure</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">All employers and job postings are verified by PESO to ensure legitimacy, safety, and quality.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="icon-chip bg-blue-50 flex-shrink-0">
                    <Clock className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Real-Time Updates</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Receive instant notifications about new jobs, application status, and interview schedules.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="icon-chip bg-slate-100 flex-shrink-0">
                    <Globe className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Local & Beyond</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Access jobs in General Santos City and connect with opportunities nationwide.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-section p-8 lg:p-10 border border-slate-200">
              <div className="surface-card p-8 shadow-sm border-slate-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Official PESO Platform</h3>
                  <p className="text-slate-600 text-sm">Trusted by thousands across General Santos</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-700">Government Approved</span>
                    <CheckCircle2 className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-700">Data Privacy Compliant</span>
                    <CheckCircle2 className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-700">Free for Jobseekers</span>
                    <CheckCircle2 className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-700">24/7 Platform Access</span>
                    <CheckCircle2 className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Introduction / About PESO */}
      <section className="w-full bg-slate-900 section-normal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Video className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wide">Watch Our Story</span>
              </div>
              <h2 className="section-title text-white">
                Empowering GenSan's Workforce Since 1999
              </h2>
              <p className="section-copy text-slate-300">
                Learn how PESO General Santos City has been connecting talent with opportunity for over two decades, creating sustainable employment and driving economic growth in our community.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 text-sm font-semibold">
                  <Play className="w-4 h-4 mr-2" />
                  Play Overview
                </Button>
                <Button variant="outline" size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900 px-6 py-5 text-sm font-semibold">
                  Explore PESO Programs
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-blue-600 to-slate-700 rounded-card overflow-hidden shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg">
                    <Play className="w-8 h-8 text-blue-600 ml-1" />
                  </div>
                </div>
                {/* Placeholder for video thumbnail */}
                <img src="/peso-gsc-logo.png" alt="PESO Video" className="w-full h-full object-cover opacity-30" />
              </div>
              {/* Stats overlay */}
              <div className="absolute -bottom-6 -right-6 bg-white rounded-card p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">95%</div>
                    <div className="text-xs text-slate-600">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Metrics Dashboard */}
      <section className="w-full bg-slate-50 section-dense">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="section-title text-2xl md:text-3xl mb-2">Measured Impact, Real Outcomes</h2>
            <p className="section-copy text-base max-w-2xl mx-auto">
              Data-driven results that showcase the power of connecting talent with opportunity in General Santos City.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="icon-chip-sm bg-blue-50">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="px-2 py-0.5 bg-blue-50 rounded-full">
                  <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +24%
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(stats?.jobseekersRegistered || 0)}
              </div>
              <p className="text-sm text-slate-600 font-medium">Total Jobseekers</p>
              <p className="text-xs text-slate-500 mt-1">Active profiles this year</p>
            </div>

            <div className="surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="icon-chip-sm bg-slate-100">
                  <Building2 className="w-5 h-5 text-slate-700" />
                </div>
                <div className="px-2 py-0.5 bg-blue-50 rounded-full">
                  <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +18%
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(stats?.employersParticipating || 0)}
              </div>
              <p className="text-sm text-slate-600 font-medium">Partner Employers</p>
              <p className="text-xs text-slate-500 mt-1">Verified companies</p>
            </div>

            <div className="surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="icon-chip-sm bg-blue-50">
                  <Briefcase className="w-5 h-5 text-blue-700" />
                </div>
                <div className="px-2 py-0.5 bg-blue-50 rounded-full">
                  <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +32%
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {isLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(stats?.jobsMatched || 0)}
              </div>
              <p className="text-sm text-slate-600 font-medium">Successful Placements</p>
              <p className="text-xs text-slate-500 mt-1">Jobs matched & filled</p>
            </div>

            <div className="surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="icon-chip-sm bg-slate-100">
                  <BarChart3 className="w-5 h-5 text-slate-700" />
                </div>
                <div className="px-2 py-0.5 bg-blue-50 rounded-full">
                  <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +15%
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {impactLoading ? <Skeleton className="h-8 w-20" /> : impactData?.satisfactionRate || "94.5%"}
              </div>
              <p className="text-sm text-slate-600 font-medium">Satisfaction Rate</p>
              <p className="text-xs text-slate-500 mt-1">User feedback score</p>
            </div>
          </div>

          {/* Additional Impact Stats */}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-600 rounded-card p-5 text-white shadow-sm">
              <div className="text-3xl font-bold mb-1">
                {impactLoading ? <Skeleton className="h-8 w-20 bg-blue-500" /> : impactData?.avgTimeToInterview || "48 hrs"}
              </div>
              <p className="text-blue-100 text-sm font-medium">Average Time to First Interview</p>
            </div>
            <div className="bg-slate-700 rounded-card p-5 text-white shadow-sm">
              <div className="text-3xl font-bold mb-1">
                {impactLoading ? <Skeleton className="h-8 w-20 bg-slate-600" /> : impactData?.avgSalary || "₱32.5K"}
              </div>
              <p className="text-slate-200 text-sm font-medium">Average Starting Salary</p>
            </div>
            <div className="bg-blue-700 rounded-card p-5 text-white shadow-sm">
              <div className="text-3xl font-bold mb-1">
                {impactLoading ? <Skeleton className="h-8 w-20 bg-blue-600" /> : `${impactData?.yearsOfService || 25} years`}
              </div>
              <p className="text-blue-100 text-sm font-medium">Serving General Santos City</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories / Testimonials Section */}
      <section className="w-full bg-white section-normal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title mb-3">Success Stories</h2>
            <p className="section-copy max-w-2xl mx-auto">
              Real people, real results. See how GensanWorks has transformed careers and businesses across our city.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="surface-subtle interactive-card p-7">
              <div className="flex items-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "As a fresh graduate with no work experience, I was worried about finding a job. GensanWorks' career counseling and resume workshop gave me the confidence I needed. I got hired as a junior software developer within 2 weeks!"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  MR
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Maria Rodriguez</p>
                  <p className="text-xs text-slate-600">Software Developer at TechHub GSC</p>
                </div>
              </div>
            </div>
            
            <div className="surface-subtle interactive-card p-7">
              <div className="flex items-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "Our company struggled to find qualified local talent. GensanWorks connected us with amazing candidates—verified, skilled, and ready to work. We've hired 5 employees in just one month and saved thousands on recruitment costs."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-slate-700 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  JT
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">John Tan</p>
                  <p className="text-xs text-slate-600">HR Manager, GenSan Tech Inc.</p>
                </div>
              </div>
            </div>
            
            <div className="surface-subtle interactive-card p-7">
              <div className="flex items-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "After being unemployed for 8 months, I was losing hope. The PESO team through GensanWorks not only helped me update my skills but matched me with a company looking for exactly my expertise. I'm now thriving in my career!"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-blue-700 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  AS
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Anna Santos</p>
                  <p className="text-xs text-slate-600">Senior Marketing Specialist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional testimonial row */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="surface-subtle interactive-card p-7">
              <div className="flex items-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "The AI matching system is incredible! It recommended jobs I hadn't even considered but turned out to be perfect for my skills. Got 3 interview calls in the first week. This platform truly understands what jobseekers need."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-slate-700 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  RD
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Roberto Del Rosario</p>
                  <p className="text-xs text-slate-600">Electrical Engineer</p>
                </div>
              </div>
            </div>

            <div className="surface-subtle interactive-card p-7">
              <div className="flex items-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "As a working mother returning to the workforce after 5 years, I was nervous. GensanWorks made the transition smooth with flexible job options and supportive employers. I'm now balancing work and family perfectly."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-blue-700 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  LC
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Linda Cruz</p>
                  <p className="text-xs text-slate-600">Administrative Assistant</p>
                </div>
              </div>
            </div>

            <div className="surface-subtle interactive-card p-7">
              <div className="flex items-center gap-0.5 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                "From application to job offer in just 10 days! The direct messaging feature let me communicate with the HR manager instantly. No more waiting weeks for email responses. GensanWorks revolutionizes job hunting."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-11 h-11 bg-slate-700 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  PM
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Paolo Mendoza</p>
                  <p className="text-xs text-slate-600">Customer Service Representative</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News & Announcements */}
      <section className="max-w-7xl mx-auto section-normal px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="section-title mb-3">Latest News & Announcements</h2>
          <p className="section-copy">Stay updated with the latest employment opportunities and events</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="surface-card overflow-hidden interactive-card">
            <div className="bg-blue-600 p-6 text-white">
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider">UPCOMING EVENT</div>
              <h3 className="text-xl font-bold">City-Wide Job Fair 2025</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                Join our biggest job fair of the year on December 10, 2025 at the City Hall Grounds. Over 100 companies actively hiring!
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
                <MapPin className="w-4 h-4" />
                <span>City Hall, General Santos</span>
              </div>
              <a href="/contact" className="text-blue-600 font-semibold hover:underline text-sm inline-flex items-center gap-1 group">
                Register Now <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="surface-card overflow-hidden interactive-card">
            <div className="bg-slate-700 p-6 text-white">
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider">NEW FEATURE</div>
              <h3 className="text-xl font-bold">Enhanced Employer Portal</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                We've launched new tools for employers: advanced filtering, bulk messaging, and detailed analytics dashboard.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
                <Clock className="w-4 h-4" />
                <span>Available Now</span>
              </div>
              <a href="/signup/employer" className="text-slate-700 font-semibold hover:underline text-sm inline-flex items-center gap-1 group">
                Learn More <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="surface-card overflow-hidden interactive-card">
            <div className="bg-blue-700 p-6 text-white">
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider">FREE TRAINING</div>
              <h3 className="text-xl font-bold">Resume Writing Workshop</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                Free online seminar for jobseekers: Learn how to create a compelling resume that gets noticed by employers.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
                <Clock className="w-4 h-4" />
                <span>Every Saturday, 2PM</span>
              </div>
              <a href="/help" className="text-blue-700 font-semibold hover:underline text-sm inline-flex items-center gap-1 group">
                Register Free <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Skills in Demand Section */}
      <section className="w-full section-dense bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h2 className="section-title text-2xl md:text-3xl mb-2">Top Skills in Demand</h2>
            <p className="section-copy text-base">What employers in General Santos are looking for right now</p>
          </div>

          {skillsLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : (
            <div className="surface-card p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Code className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Most In-Demand Skills from Our Database</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3.5">
                {skillsData && skillsData.length > 0 ? (
                  skillsData.map((item, index) => {
                    const color =
                      skillColorClasses[index % skillColorClasses.length] || {
                        text: "text-blue-600",
                        bar: "from-blue-500 to-blue-600",
                      };
                    
                    return (
                      <div key={index}>
                        <div className="flex justify-between mb-1.5">
                          <span className="font-semibold text-slate-900 text-sm">{item.skill}</span>
                          <span className={`${color.text} font-semibold text-sm`}>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`bg-gradient-to-r ${color.bar} h-2 rounded-full transition-all duration-500`}
                            style={{width: `${item.percentage}%`}}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center text-slate-500 py-6 text-sm">
                    No skills data available yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Training Programs CTA */}
          <div className="mt-6 bg-blue-600 rounded-card p-6 text-center shadow-sm">
            <h3 className="text-xl font-bold text-white mb-2">Want to learn these skills?</h3>
            <p className="text-blue-100 text-sm mb-4">PESO General Santos offers FREE training programs to help you develop in-demand skills</p>
            <a href="/training" className="inline-flex items-center gap-1.5 bg-white text-blue-600 px-5 py-2.5 rounded-lg font-semibold hover:shadow-md transition-shadow text-sm">
              Browse Training Programs <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Expected Skills Shortage Section */}
      <section className="w-full bg-white section-dense border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-7 h-7 text-slate-700" />
            </div>
            <h2 className="section-title text-2xl md:text-3xl mb-2">Expected Skills Shortage (Demo Insights)</h2>
            <p className="section-copy text-base max-w-2xl mx-auto">
              Mock projections crafted with PESO planners to illustrate which roles may run short over the next few quarters.
              Real dashboards will wire up once the labor market observatory goes live.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.5fr_0.8fr] gap-8">
            <div className="bg-slate-50 border border-slate-200 rounded-section p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-[0.25em]">Forecast</p>
                  <h3 className="text-xl font-bold text-slate-900">Clusters likely to feel the crunch</h3>
                </div>
                <span className="text-xs text-slate-500">Demo dataset</span>
              </div>
              <div className="space-y-4">
                {expectedSkillsShortage.map((item) => (
                  <div key={item.skillCluster} className="surface-card p-4 hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                        {item.projectedGap}
                      </span>
                      <p className="text-sm text-slate-500 font-medium">{item.timeframe}</p>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">{item.skillCluster}</h4>
                    <p className="text-sm text-slate-600 mt-1">Driver: {item.driver}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400 mt-2">Priority Focus</p>
                    <p className="text-sm font-semibold text-slate-900">{item.focus}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-slate-900 text-white rounded-section p-6 shadow-lg">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Suggested Actions</p>
                <h3 className="text-2xl font-bold mt-2">What PESO can launch next</h3>
                <p className="text-sm text-white/80 mt-2">
                  These demo playbooks turn insights into programs. Swap them for live projects later.
                </p>
              </div>
              {shortageInitiatives.map((initiative) => (
                <div key={initiative.title} className="border border-slate-200 rounded-card p-5 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{initiative.title}</h4>
                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full">
                      {initiative.owner}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{initiative.description}</p>
                </div>
              ))}
              <div className="rounded-card border border-dashed border-slate-300 p-5 bg-slate-50">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">More ideas</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700 list-disc list-inside">
                  <li>Publish quarterly shortage bulletin PDF</li>
                  <li>Embed sign-up for fast-track scholarships</li>
                  <li>Open employer pledge board for co-funding</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full bg-white section-normal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="section-title mb-3">Frequently Asked Questions</h2>
            <p className="section-copy">Quick answers to common questions about GensanWorks</p>
          </div>
          
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="surface-subtle overflow-hidden hover:shadow-sm transition-shadow">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-5 text-left flex justify-between items-center gap-4 hover:bg-slate-100 transition-colors"
                >
                  <span className="font-semibold text-base text-slate-900">{faq.question}</span>
                  <ChevronRight className={`w-5 h-5 text-blue-600 flex-shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter / CTA Section */}
      <section className="w-full bg-blue-600 section-dense">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-title text-white mb-4">Get Job Updates in Your Inbox</h2>
          <p className="section-copy text-blue-100 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter for the latest job postings, career tips, and employment news delivered to your inbox.
          </p>
          
          <form onSubmit={handleNewsletterSubmit} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-5 py-3 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
              />
              <Button
                type="submit"
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-shadow"
              >
                Subscribe
              </Button>
            </div>
          </form>
          
          <p className="text-blue-100 text-xs mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </section>

      {/* Mobile App Promotion (Future Ready) */}
      <section className="w-full bg-slate-900 section-normal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Coming Soon</span>
              </div>
              <h2 className="section-title text-white">
                Take Your Job Search Mobile
              </h2>
              <p className="section-copy text-slate-300">
                Soon you'll be able to search for jobs, apply instantly, and manage your career from anywhere with the GensanWorks mobile app. Get notified the moment we launch!
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-0.5">Instant Job Alerts</h3>
                    <p className="text-slate-400 text-sm">Get real-time notifications for new job matches</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-0.5">One-Tap Apply</h3>
                    <p className="text-slate-400 text-sm">Apply to jobs with a single tap using your saved profile</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-0.5">Chat with Employers</h3>
                    <p className="text-slate-400 text-sm">Direct messaging with hiring managers on the go</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-5 text-sm font-semibold rounded-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Join Mobile Waitlist
                </Button>
              </div>

              <div className="flex items-center gap-5 pt-4">
                <div className="flex items-center gap-2 opacity-60">
                  <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium">iOS & Android</span>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium">Free Download</span>
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="relative">
              <div className="relative mx-auto w-[260px] h-[520px]">
                {/* Phone Frame */}
                <div className="absolute inset-0 bg-slate-800 rounded-hero shadow-lg border-[6px] border-slate-700">
                  {/* Screen */}
                  <div className="absolute inset-2 bg-gradient-to-b from-slate-50 to-white rounded-section overflow-hidden">
                    {/* Content placeholder */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg"></div>
                        <div className="font-semibold text-slate-900 text-sm">GensanWorks</div>
                      </div>
                      {[1,2,3].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
                          <div className="h-3 bg-slate-200 rounded mb-1.5"></div>
                          <div className="h-2.5 bg-slate-100 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-xl"></div>
                </div>
                {/* Floating elements */}
                <div className="absolute -right-6 top-16 w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
                <div className="absolute -left-6 bottom-28 w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-blue-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="w-full bg-white section-normal">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white p-10 lg:p-14 shadow-2xl">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-white/5 blur-3xl" />
            <div className="relative grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div className="space-y-5">
                <p className="text-xs font-semibold tracking-[0.45em] uppercase text-white/70">Next Steps</p>
                <h2 className="section-title text-white">
                  Ready to turn applications into offers?
                </h2>
                <p className="section-copy text-white/80">
                  Whether you're a jobseeker or an employer, GensanWorks keeps hiring conversations moving with instant alerts, guided interviews, and PESO-backed trust.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="/signup/jobseeker" className="flex-1 sm:flex-initial">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 px-8 py-5 text-sm font-semibold">
                      Start as Jobseeker
                    </Button>
                  </a>
                  <a href="/signup/employer" className="flex-1 sm:flex-initial">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto border-white/60 text-white hover:bg-white/10 px-8 py-5 text-sm font-semibold">
                      Start as Employer
                    </Button>
                  </a>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {ctaHighlights.map((item) => (
                  <div key={item.label} className="rounded-card border border-white/25 bg-white/10 backdrop-blur p-4">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-white/70">Included for free</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="w-full bg-slate-50 border-t border-slate-200 section-dense">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* PESO Information */}
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <img src="/peso-gsc-logo.png" alt="PESO Logo" className="h-10 w-10" />
                <span className="font-bold text-lg">GensanWorks</span>
              </div>
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                <span className="font-semibold block mb-0.5">City Government of General Santos</span>
                Public Employment Service Office
              </p>
              <a href="/help" className="text-sm text-primary hover:underline font-medium">Accessibility Statement</a>
            </div>

            {/* Contact us */}
            <div>
              <h3 className="font-bold text-slate-900 mb-5 text-sm">Contact Us</h3>
              <ul className="space-y-2.5 text-sm">
                <li className="text-slate-700">{generalSettings.address}</li>
                <li>
                  <a href="/contact" className="text-primary hover:underline font-medium">PESO Helpdesk</a>
                </li>
                <li>
                  <a href={`tel:${generalSettings.contactPhone}`} className="text-slate-600 hover:text-primary transition-colors">
                    📞 {generalSettings.contactPhone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${generalSettings.contactEmail}`} className="text-slate-600 hover:text-primary transition-colors">
                    ✉️ {generalSettings.contactEmail}
                  </a>
                </li>
              </ul>
              <h4 className="font-bold text-slate-900 mt-6 mb-3 text-sm">Follow Us</h4>
              <div className="flex gap-2.5">
                <a href="https://www.facebook.com/PESO.GeneralSantos" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600 hover:text-white">
                    <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.716-1.796 1.767v2.317h3.59l-.467 3.622h-3.123V24h6.125C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z"/>
                  </svg>
                </a>
                <a href="https://x.com/pesogensan" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center hover:bg-black transition-colors" aria-label="X">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-black hover:text-white">
                    <path d="M18.902 1H22L13.5 11.004 22.5 23h-7.1l-5.5-7.2-6.1 7.2H2l8.9-10.5L1.5 1h7.2l5 6.6L18.902 1z"/>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/pesogensan" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-700 hover:text-white">
                    <path d="M4.983 3.5C4.983 5 3.88 6 2.5 6S0 5 0 3.5 1.103 1 2.483 1s2.5 1 2.5 2.5zM.5 8h4V23h-4V8zm7.5 0h3.834v2.05h.054c.534-1.012 1.84-2.05 3.787-2.05 4.05 0 4.8 2.664 4.8 6.128V23h-4v-6.52c0-1.556-.028-3.556-2.17-3.556-2.17 0-2.5 1.693-2.5 3.444V23h-3.8V8z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* About us */}
            <div>
              <h3 className="font-bold text-slate-900 mb-5 text-sm">Quick Links</h3>
              <ul className="space-y-2.5 text-sm">
                <li><a href="/about" className="text-slate-600 hover:text-primary transition-colors">About PESO</a></li>
                <li><a href="/help" className="text-slate-600 hover:text-primary transition-colors">Help & Support</a></li>
                <li><a href="/privacy" className="text-slate-600 hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="/contact" className="text-slate-600 hover:text-primary transition-colors">Contact Information</a></li>
                <li><a href="/admin-portal" className="text-slate-600 hover:text-primary transition-colors">Admin Portal</a></li>
              </ul>
            </div>

            {/* Legal & Resources */}
            <div>
              <h3 className="font-bold text-slate-900 mb-5 text-sm">Resources</h3>
              <ul className="space-y-2.5 text-sm">
                <li><a href="https://dole.gov.ph" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-colors">Department of Labor (DOLE)</a></li>
                <li><a href="https://philjobnet.gov.ph/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-colors">PhilJobNet</a></li>
                <li><a href="https://psa.gov.ph" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-colors">Philippine Statistics Authority</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600">
            <div className="mb-3 md:mb-0">
              <span>© 2025 City Government of General Santos. All rights reserved.</span>
            </div>
            <div>
              <span>Discover more on </span>
              <a href="https://gensantos.gov.ph/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                gensantos.gov.ph
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
