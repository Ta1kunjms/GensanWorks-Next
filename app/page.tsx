import type { Metadata } from "next";

import { Header } from "@/components/homepage/header";
import { HeroSection } from "@/components/homepage/hero-section";
import { EmployerCarouselSection } from "@/components/homepage/employer-carousel-section";
import { JobCategoriesSection } from "@/components/homepage/job-categories-section";
import { LatestJobsSection } from "@/components/homepage/latest-jobs-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { ServicesSection } from "@/components/homepage/services-section";
import { VideoSection } from "@/components/homepage/video-section";
import { LabourMarketInsightsSection } from "@/components/homepage/labour-market-insights-section";
import { ImpactMetricsSection } from "@/components/homepage/impact-metrics-section";
import { WhyChooseUsSection } from "@/components/homepage/why-choose-us-section";
import { ExperienceSection } from "@/components/homepage/experience-section";
import { NewsSection } from "@/components/homepage/news-section";
import { CallToActionSection } from "@/components/homepage/call-to-action-section";
import { FaqSection } from "@/components/homepage/faq-section";
import { Footer } from "@/components/homepage/footer";
import { getLandingContent, getLaborMarketData } from "@/lib/labor-market-server";

// Landing page: the pre-cleanup design (restored by the owner 2026-10-23) with every
// number taken from the public labour-market aggregates (the same loadLaborMarket()
// that serves /api/public/labor-market). Server Component: data is loaded on the
// server and cached for 5 minutes; only interactive pieces are client components.
// When the data cannot be loaded every figure shows "—" (never an invented number).
// Not rendered: partners-section (hard-coded brands, replaced by the employer carousel),
// testimonials-section (its landing API substitutes invented quotes when the table is
// empty), and the sector/skills/skill-gap/breakdown sections, merged into the
// Labour Market Snapshot hub (labour-market-insights-section.tsx).

export const revalidate = 300;

// /api/settings/general/public returns these fixed values; the server uses them directly.
const generalSettings = {
  siteName: "GensanWorks",
  siteDescription: "Job assistance platform for PESO General Santos City",
  // No placeholder phone/email: contact lines render only when real values exist.
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

export const metadata: Metadata = {
  title: `${generalSettings.siteName} — ${generalSettings.siteDescription}`,
  description: generalSettings.siteDescription,
  keywords: generalSettings.seoKeywords,
  openGraph: {
    title: generalSettings.siteName,
    description: generalSettings.siteDescription,
    images: [generalSettings.heroBackgroundImage],
  },
  twitter: {
    card: "summary_large_image",
    title: generalSettings.siteName,
    description: generalSettings.siteDescription,
    images: [generalSettings.heroBackgroundImage],
  },
};

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

export default async function Landing() {
  const [market, content] = await Promise.all([getLaborMarketData(), getLandingContent()]);
  const failed = market === null;
  const displayFaqs = content.faqs.length > 0 ? content.faqs : staticFaqs;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-200 selection:text-blue-900 overflow-hidden">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroSection generalSettings={generalSettings} market={market} />
        <EmployerCarouselSection employers={market?.employers} failed={failed} />
        <JobCategoriesSection categories={content.categories} />
        <LatestJobsSection jobs={market?.latestJobs} failed={failed} />
        <HowItWorksSection />
        <ServicesSection />
        <VideoSection />
        <LabourMarketInsightsSection market={market} />
        <ImpactMetricsSection market={market ?? undefined} failed={failed} />
        <WhyChooseUsSection />
        <ExperienceSection />
        <NewsSection news={content.news} />
        <CallToActionSection totals={market?.totals} />
        <FaqSection faqs={displayFaqs} />
      </main>
      <Footer generalSettings={generalSettings} />
    </div>
  );
}
