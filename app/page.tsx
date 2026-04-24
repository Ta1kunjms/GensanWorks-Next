"use client";

/* eslint-disable @next/next/next/no-img-element, @next/next/no-html-link-for-pages, react/no-unescaped-entities */

import { useEffect, useRef, useState } from "react";
import type { ElementType, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle2,
  Award,
} from "lucide-react";

import { Header } from "@/components/homepage/header";
import { HeroSection } from "@/components/homepage/hero-section";
import { PartnersSection } from "@/components/homepage/partners-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { ServicesSection } from "@/components/homepage/services-section";
import { JobCategoriesSection } from "@/components/homepage/job-categories-section";
import { ExperienceSection } from "@/components/homepage/experience-section";
import { VideoSection } from "@/components/homepage/video-section";
import { ImpactMetricsSection } from "@/components/homepage/impact-metrics-section";
import { TestimonialsSection } from "@/components/homepage/testimonials-section";
import { NewsSection } from "@/components/homepage/news-section";
import { SkillsDemandSection } from "@/components/homepage/skills-demand-section";
import { SkillsShortageSection } from "@/components/homepage/skills-shortage-section";
import { WhyChooseUsSection } from "@/components/homepage/why-choose-us-section";
import { CallToActionSection } from "@/components/homepage/call-to-action-section";
import { Footer } from "@/components/homepage/footer";

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

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  quote: string;
  isVerified: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  link_url: string;
  published_at: string;
}

interface Category {
  name: string;
  category: string;
  jobs: string;
}

interface SkillsData {
  skill: string;
  percentage: number;
}

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

const trustSignals: Array<{ title: string; description: string; icon: typeof Shield | typeof CheckCircle2 | typeof Award; accent: string }> = [
  { title: "Government Certified", description: "Official PESO platform", icon: Shield, accent: "bg-blue-50 text-blue-600" },
  { title: "Data Protected", description: "Secure by design", icon: CheckCircle2, accent: "bg-blue-50 text-blue-600" },
  { title: "Service Excellence", description: "ISO-aligned workflows", icon: Award, accent: "bg-slate-100 text-slate-600" },
];

const heroBadgePhrases = [
  { title: "Smart Matching", description: "AI-assisted recommendations tuned by PESO counselors" },
  { title: "Verified Employers", description: "Every company undergoes compliance screening" },
  { title: "Lightning Placement", description: "Interviews arranged within 48 hours on average" },
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
  const activeHeroBadge = heroBadgePhrases[heroBadgeIndex] ?? { title: "Smart Matching", description: "AI-assisted recommendations tuned by PESO counselors" };

  // Fetch general settings
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

  // Fetch summary data
  const { data: summaryData, isLoading } = useQuery<SummaryData>({
    queryKey: ["landing", "summary"],
    queryFn: async () => {
      const response = await fetch("/api/summary");
      if (!response.ok) throw new Error("Failed to fetch summary data");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch impact metrics
  const { data: impactData, isLoading: impactLoading } = useQuery<ImpactMetrics>({
    queryKey: ["landing", "impact"],
    queryFn: async () => {
      const response = await fetch("/api/public/impact");
      if (!response.ok) throw new Error("Failed to fetch impact data");
      return response.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch skills data
  const { data: skillsApiData, isLoading: skillsLoading } = useQuery<SkillsData[]>({
    queryKey: ["landing", "skills"],
    queryFn: async () => {
      const response = await fetch("/api/landing/skills");
      if (!response.ok) throw new Error("Failed to fetch skills data");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch testimonials
  const { data: testimonialsData, isLoading: testimonialsLoading } = useQuery<{ testimonials: Testimonial[] }>({
    queryKey: ["landing", "testimonials"],
    queryFn: async () => {
      const response = await fetch("/api/landing/testimonials");
      if (!response.ok) throw new Error("Failed to fetch testimonials");
      return response.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch FAQs
  const { data: faqsData, isLoading: faqsLoading } = useQuery<{ faqs: FAQ[] }>({
    queryKey: ["landing", "faqs"],
    queryFn: async () => {
      const response = await fetch("/api/landing/faqs");
      if (!response.ok) throw new Error("Failed to fetch faqs");
      return response.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  // Fetch Partners
  const { data: partnersData, isLoading: partnersLoading } = useQuery<{ partners: Partner[] }>({
    queryKey: ["landing", "partners"],
    queryFn: async () => {
      const response = await fetch("/api/landing/partners");
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  // Fetch News
  const { data: newsData, isLoading: newsLoading } = useQuery<{ news: NewsItem[] }>({
    queryKey: ["landing", "news"],
    queryFn: async () => {
      const response = await fetch("/api/landing/news");
      if (!response.ok) throw new Error("Failed to fetch news");
      return response.json();
    },
    staleTime: 1000 * 60 * 15,
  });

  // Fetch Categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ["landing", "categories"],
    queryFn: async () => {
      const response = await fetch("/api/landing/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
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

  const defaultSkillsData = [
    { skill: "Customer Support", percentage: 92 },
    { skill: "Digital Marketing", percentage: 88 },
    { skill: "Accounting", percentage: 84 },
    { skill: "Front-End Development", percentage: 81 },
    { skill: "Healthcare Assistance", percentage: 79 },
    { skill: "Logistics Management", percentage: 75 },
    { skill: "Sales Strategy", percentage: 73 },
    { skill: "Technical Support", percentage: 69 },
  ];

  const skillsData = skillsApiData && skillsApiData.length > 0 ? skillsApiData : defaultSkillsData;

  const handleNewsletterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Thank you for subscribing to our newsletter!");
    setEmail("");
  };

  const staticFaqs = [
    { question: "How do I register as a jobseeker on GensanWorks?", answer: "Click on 'Sign Up' or 'Get Started' button, fill in your personal information, upload your resume, and complete your profile." },
    { question: "Is there a fee to use GensanWorks?", answer: "No, GensanWorks is completely free for jobseekers." },
    { question: "How can employers post job vacancies?", answer: "Employers need to register for an employer account, verify their company information with PESO." },
    { question: "What documents do I need to upload?", answer: "At minimum, upload your resume/CV. Additional documents will strengthen your profile." },
    { question: "How does the AI-powered job matching system work?", answer: "Our intelligent matching system analyzes your skills, experience, and preferences." },
    { question: "Can I apply for jobs outside General Santos City?", answer: "Yes! Our platform features jobs from across SOCCSKSARGEN region and nationwide." },
    { question: "How long does it take to get hired?", answer: "Most candidates receive interview invitation within 48 hours of application." },
    { question: "What makes GensanWorks different from other job platforms?", answer: "GensanWorks is the official PESO platform, all employers and jobs are verified by the government." }
  ];

  const displayFaqs = faqsData?.faqs && faqsData.faqs.length > 0 ? faqsData.faqs : staticFaqs;

return (
      <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-200 selection:text-blue-900 overflow-hidden">
        <Header />
        <HeroSection
          generalSettings={generalSettings}
          isLoading={isLoading}
          animatedJobseekers={animatedJobseekers}
          animatedEmployers={animatedEmployers}
          animatedMatches={animatedMatches}
          activeHeroBadge={activeHeroBadge}
          impactLoading={impactLoading}
          impactData={impactData}
          summaryData={summaryData}
        />
        <JobCategoriesSection categories={categoriesData?.categories} loading={categoriesLoading} />
        <HowItWorksSection />
        <ServicesSection />
        <SkillsDemandSection skillsData={skillsData} loading={skillsLoading} />
        <SkillsShortageSection />
        <WhyChooseUsSection />
        <ExperienceSection />
        <ImpactMetricsSection
          summaryData={summaryData}
          impactData={impactData}
          isLoading={isLoading}
          impactLoading={impactLoading}
        />
        <TestimonialsSection testimonials={testimonialsData?.testimonials} loading={testimonialsLoading} />
        <PartnersSection partners={partnersData?.partners} loading={partnersLoading} />
        <NewsSection news={newsData?.news} loading={newsLoading} />
        <VideoSection />
        <CallToActionSection
          faqs={displayFaqs}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
          email={email}
          setEmail={setEmail}
          handleNewsletterSubmit={handleNewsletterSubmit}
        />
        <Footer generalSettings={generalSettings} />
      </div>
    );
}