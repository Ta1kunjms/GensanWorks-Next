"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Header } from "@/components/homepage/header";
import { HeroSection } from "@/components/homepage/hero-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { JobCategoriesSection } from "@/components/homepage/job-categories-section";
import { ImpactMetricsSection } from "@/components/homepage/impact-metrics-section";
import { SkillsDemandSection } from "@/components/homepage/skills-demand-section";
import { FaqSection } from "@/components/homepage/faq-section";
import { Footer } from "@/components/homepage/footer";

// Landing page, 7 sections: hero, job categories, how it works (with services),
// labour-market snapshot, numbers, FAQ, footer. The other homepage section files
// (partners, testimonials, news, video, why-choose-us, experience, skills-shortage,
// services, call-to-action) are kept but no longer rendered.

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

interface FAQ {
  question: string;
  answer: string;
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
  // No placeholder phone/email: contact lines render only when the settings API supplies them.
  contactEmail: "",
  contactPhone: "",
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

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  // Fetch summary data (the only source for the numbers section)
  const { data: summaryData, isLoading, dataUpdatedAt: summaryUpdatedAt } = useQuery<SummaryData>({
    queryKey: ["landing", "summary"],
    queryFn: async () => {
      const response = await fetch("/api/summary");
      if (!response.ok) throw new Error("Failed to fetch summary data");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch skills data (labour-market snapshot; no client-side fallback values)
  const {
    data: skillsApiData,
    isLoading: skillsLoading,
    dataUpdatedAt: skillsUpdatedAt,
  } = useQuery<SkillsData[]>({
    queryKey: ["landing", "skills"],
    queryFn: async () => {
      const response = await fetch("/api/landing/skills");
      if (!response.ok) throw new Error("Failed to fetch skills data");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
    // /api/landing/skills returns a hard-coded list, not labour-market data, so the
    // public snapshot stays off until it is backed by real job-post skills.
    enabled: false,
  });

  // Fetch FAQs
  const { data: faqsData } = useQuery<{ faqs: FAQ[] }>({
    queryKey: ["landing", "faqs"],
    queryFn: async () => {
      const response = await fetch("/api/landing/faqs");
      if (!response.ok) throw new Error("Failed to fetch faqs");
      return response.json();
    },
    staleTime: 1000 * 60 * 60,
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

  // Empty while the query is disabled, so SkillsDemandSection renders nothing.
  const skillsData = Array.isArray(skillsApiData) ? skillsApiData : [];

  // No guaranteed timeframes or accuracy claims; matching is described as assistance only.
  const staticFaqs = [
    { question: "How do I register as a jobseeker on GensanWorks?", answer: "Click on 'Sign Up' or 'Get Started' button, fill in your personal information, upload your resume, and complete your profile." },
    { question: "Is there a fee to use GensanWorks?", answer: "No, GensanWorks is completely free for jobseekers." },
    { question: "How can employers post job vacancies?", answer: "Employers need to register for an employer account, verify their company information with PESO." },
    { question: "What documents do I need to upload?", answer: "At minimum, upload your resume/CV. Additional documents will strengthen your profile." },
    { question: "How are job suggestions made?", answer: "GensanWorks gives AI-assisted suggestions based on job-related information such as your skills, education and experience. They are suggestions only; PESO staff and employers make the decisions." },
    { question: "Can I apply for jobs outside General Santos City?", answer: "Listings depend on what employers post. Check each job post for its work location." },
    { question: "How long does it take to get hired?", answer: "It depends on the job and the employer. You can follow the status of each application in your account." },
    { question: "How is GensanWorks different from other job platforms?", answer: "GensanWorks is run with the Public Employment Service Office (PESO) of General Santos City. PESO staff review employer accounts before they can post jobs." }
  ];

  const displayFaqs = faqsData?.faqs && faqsData.faqs.length > 0 ? faqsData.faqs : staticFaqs;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroSection generalSettings={generalSettings} />
        <JobCategoriesSection categories={categoriesData?.categories} loading={categoriesLoading} />
        <HowItWorksSection />
        <SkillsDemandSection
          skillsData={skillsData}
          loading={skillsLoading}
          asOf={skillsUpdatedAt || undefined}
        />
        <ImpactMetricsSection
          summaryData={summaryData}
          isLoading={isLoading}
          asOf={summaryData ? summaryUpdatedAt || undefined : undefined}
        />
        <FaqSection faqs={displayFaqs} openFaq={openFaq} setOpenFaq={setOpenFaq} />
      </main>
      <Footer generalSettings={generalSettings} />
    </div>
  );
}
