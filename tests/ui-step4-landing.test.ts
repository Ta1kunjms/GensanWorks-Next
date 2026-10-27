// Landing page integrity and accessibility (UI cleanup Step 4, revised 2026-10-23).
// The owner restored the pre-cleanup landing design; these checks keep the Step 4
// integrity rules on the restored sections: no fabricated numbers or claims, no
// growth badges, no hard-coded partner brands or invented testimonials, numbers
// from /api/public/labor-market only, and the Step 4 accessibility fixes.
// Static source checks, same style as tests/ui-step3.test.ts.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const PAGE = "app/page.tsx";
const HOME = "app/components/homepage";

// Homepage components that app/page.tsx renders.
const RENDERED = [
  "header.tsx",
  "hero-section.tsx",
  "employer-carousel-section.tsx",
  "job-categories-section.tsx",
  "latest-jobs-section.tsx",
  "how-it-works-section.tsx",
  "services-section.tsx",
  "video-section.tsx",
  "labour-market-insights-section.tsx",
  "impact-metrics-section.tsx",
  "why-choose-us-section.tsx",
  "experience-section.tsx",
  "news-section.tsx",
  "call-to-action-section.tsx",
  "faq-section.tsx",
  "footer.tsx",
  "landing-shared.tsx",
].map((file) => `${HOME}/${file}`);

// Sections merged into the Labour Market Snapshot hub (2026-10-27). No longer
// rendered, but kept on disk, so they stay under the same integrity checks.
const MERGED = [
  "sector-vacancies-section.tsx",
  "skills-demand-section.tsx",
  "skills-shortage-section.tsx",
  "job-market-breakdown-section.tsx",
].map((file) => `${HOME}/${file}`);

const BANNED_STRINGS = [
  "94%",
  "94.5%",
  "95%",
  "+15%",
  "450+",
  "120+",
  "30k+",
  "₱32",
  "48 hrs",
  "48h",
  "48 hours",
  "25 years",
  "25+ Years",
  "yearsOfService",
  "Since 1999",
  "100% Verified",
  "100% PESO",
  "ISO-aligned",
  "Government Certified",
  "10,000+",
  "open roles\"",
  "Documentary",
  "Live Demo Dataset",
];

const PARTNER_BRANDS = [
  "General Milling",
  "SM City General Santos",
  "Dole Philippines",
  "Gaisano",
  "Robinsons Place",
  "KCC Mall",
  "Mindanao Tech Hub",
  "South Cotabato Steelworks",
  "SOCCSKSARGEN Medical",
  "Pioneer Contact Center",
];

describe("landing page shows no fabricated numbers or claims", () => {
  for (const file of [PAGE, ...RENDERED, ...MERGED]) {
    it(file, () => {
      const src = read(file);
      for (const banned of [...BANNED_STRINGS, ...PARTNER_BRANDS]) {
        assert.ok(!src.includes(banned), `${file} still contains "${banned}"`);
      }
      assert.doesNotMatch(src, /Realtime/, `${file} labels cached numbers as realtime`);
      assert.doesNotMatch(src, /growth/i, `${file} shows a growth figure`);
      assert.doesNotMatch(src, /percentage: \d+|defaultSkills|defaultShortage|defaultTestimonials|defaultNewsItems|defaultJobCategories|industryPartners/);
    });
  }

  it("FAQ describes matching as assistance with human decisions", () => {
    const src = read(PAGE);
    assert.match(src, /AI-assisted suggestions/);
    assert.match(src, /PESO staff and employers make the decisions/);
    assert.doesNotMatch(src, /AI-powered|intelligent matching/i);
  });

  it("no newsletter form and no invented testimonials or partner marquee", () => {
    const page = read(PAGE);
    assert.doesNotMatch(page, /handleNewsletterSubmit|Newsletter/i);
    assert.doesNotMatch(read(`${HOME}/call-to-action-section.tsx`), /Subscribe|type="email"/);
    // /api/landing/testimonials substitutes invented quotes when its table is empty.
    assert.doesNotMatch(page, /TestimonialsSection|\/api\/landing\/testimonials/);
    assert.doesNotMatch(page, /PartnersSection|\/api\/landing\/partners/);
  });
});

describe("landing numbers come from the labour-market endpoint", () => {
  const page = read(PAGE);

  it("page loads the same aggregates as /api/public/labor-market and not the fallback-filled impact route", () => {
    // Server Component since 2026-10-27: both the page and the route call loadLaborMarket().
    assert.match(page, /getLaborMarketData\(\)/);
    assert.match(read("app/lib/labor-market-server.ts"), /const cachedLaborMarket = unstable_cache\(loadLaborMarket,/);
    assert.match(read("app/api/public/labor-market/route.ts"), /await loadLaborMarket\(\)/);
    assert.doesNotMatch(page, /\/api\/public\/impact|\/api\/landing\/skills/);
  });

  it("numbers render through Figure, which says 'Not available' for missing values", () => {
    const shared = read(`${HOME}/landing-shared.tsx`);
    assert.match(shared, /<span aria-hidden="true">—<\/span>/);
    assert.match(shared, /<span className="sr-only">Not available<\/span>/);
    for (const file of ["hero-section.tsx", "impact-metrics-section.tsx", "call-to-action-section.tsx"]) {
      assert.match(read(`${HOME}/${file}`), /<Figure value=/, file);
    }
  });

  it("impact section shows totals, both success rates with counts, and the funnel", () => {
    const src = read(`${HOME}/impact-metrics-section.tsx`);
    for (const field of ["jobseekers", "employers", "openJobs", "openVacancies", "placementRate", "applicationSuccessRate", "hiredReferrals", "hiredApplications"]) {
      assert.match(src, new RegExp(field));
    }
    assert.match(src, /Figures grow as applications and referrals are recorded\./);
    assert.match(src, /<AsOfNote/);
  });

  it("salary footnote states the daily-rate conversion", () => {
    assert.match(read(`${HOME}/sector-vacancies-section.tsx`), /Daily rates converted at 26 working days/);
    assert.match(read(`${HOME}/labour-market-insights-section.tsx`), /Daily rates × 26 working days; weekly × 52 ÷ 12;/);
  });

  it("charts are hidden from screen readers and backed by data tables", () => {
    for (const file of ["sector-vacancies-section.tsx", "skills-demand-section.tsx"]) {
      const src = read(`${HOME}/${file}`);
      assert.match(src, /<div aria-hidden="true" style=\{\{ height: chartHeight \}\}>/, file);
      assert.match(src, /<summary[^>]*>Show data table<\/summary>/, file);
      assert.match(src, /<th scope="row"/, file);
    }
    const hub = read(`${HOME}/labour-market-insights-section.tsx`);
    assert.match(hub, /<div aria-hidden="true" className="h-\[420px\] w-full">/);
    assert.match(hub, /scope="row"/);
    assert.match(hub, /<caption className="sr-only">/);
  });

  it("job categories have no placeholder counts", () => {
    assert.doesNotMatch(read(`${HOME}/job-categories-section.tsx`), /open roles"|defaultJobCategories/);
  });
});

describe("restored section order", () => {
  const src = read(PAGE);

  it("renders the sections in order", () => {
    const order = [
      "<Header",
      "<HeroSection",
      "<EmployerCarouselSection",
      "<JobCategoriesSection",
      "<LatestJobsSection",
      "<HowItWorksSection",
      "<ServicesSection",
      "<VideoSection",
      "<LabourMarketInsightsSection",
      "<ImpactMetricsSection",
      "<WhyChooseUsSection",
      "<ExperienceSection",
      "<NewsSection",
      "<CallToActionSection",
      "<FaqSection",
      "<Footer",
    ].map((tag) => src.indexOf(tag));
    for (const index of order) assert.ok(index > -1);
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.doesNotMatch(src, /<SectorVacanciesSection|<SkillsDemandSection|<SkillsShortageSection|<JobMarketBreakdownSection/);
  });

  it("services and how-it-works anchors clear the sticky header", () => {
    assert.match(read(`${HOME}/how-it-works-section.tsx`), /id="how-it-works"[^>]*scroll-mt-24/);
    assert.match(read(`${HOME}/services-section.tsx`), /id="services"[^>]*scroll-mt-24/);
  });
});

describe("employer carousel and video", () => {
  const carousel = read(`${HOME}/employer-carousel-section.tsx`);

  it("carousel shows database employers with a pause control and reduced-motion support", () => {
    assert.match(carousel, /usePrefersReducedMotion\(\)/);
    assert.match(carousel, /Pause scrolling/);
    assert.match(carousel, /onMouseEnter=\{\(\) => setHoverPaused\(true\)\}/);
    assert.match(carousel, /onFocus=\{\(\) => setHoverPaused\(true\)\}/);
    assert.match(carousel, /aria-hidden="true">\n\s+\{employers\.map/);
    assert.doesNotMatch(carousel, /demo/i);
  });

  it("video uses native controls, no autoplay, and the copied showreel", () => {
    const video = read(`${HOME}/video-section.tsx`);
    assert.match(video, /<video[\s\S]*?controls[\s\S]*?preload="none"[\s\S]*?playsInline/);
    assert.doesNotMatch(video, /autoPlay|autoplay/);
    assert.match(video, /\/videos\/gensanworks-showreel\.mp4/);
    assert.ok(existsSync(path.join(process.cwd(), "public/videos/gensanworks-showreel.mp4")));
  });
});

describe("landing accessibility", () => {
  it("has a skip link to <main id=\"main-content\">", () => {
    const header = read(`${HOME}/header.tsx`);
    assert.match(header, /href="#main-content"[\s\S]*?Skip to main content/);
    assert.ok(header.indexOf('href="#main-content"') < header.indexOf("<Link"));
    assert.match(read(PAGE), /<main id="main-content"/);
  });

  it("has exactly one h1, in the hero", () => {
    const all = [PAGE, ...RENDERED].map((file) => [file, (read(file).match(/<h1\b/g) ?? []).length] as const);
    const withH1 = all.filter(([, count]) => count > 0);
    assert.deepEqual(withH1, [[`${HOME}/hero-section.tsx`, 1]]);
  });

  it("mobile menu button toggles a real menu and returns focus on Escape", () => {
    const header = read(`${HOME}/header.tsx`);
    assert.match(header, /aria-expanded=\{menuOpen\}/);
    assert.match(header, /aria-controls=\{MOBILE_MENU_ID\}/);
    assert.match(header, /aria-label=\{menuOpen \? "Close menu" : "Open menu"\}/);
    assert.match(header, /onClick=\{\(\) => setMenuOpen/);
    assert.match(header, /id=\{MOBILE_MENU_ID\}/);
    assert.match(header, /toggleRef\.current\?\.focus\(\)/);
    assert.match(header, /addEventListener\("pointerdown"/);
  });

  it("FAQ triggers expose their expanded state", () => {
    const faq = read(`${HOME}/faq-section.tsx`);
    assert.match(faq, /aria-expanded=\{isOpen\}/);
    assert.match(faq, /aria-controls=\{panelId\}/);
    assert.match(faq, /hidden=\{!isOpen\}/);
    assert.match(faq, /type="button"/);
  });

  it("hero search has a visible label and says sign-in is needed", () => {
    const hero = read(`${HOME}/hero-section.tsx`);
    assert.match(hero, /<label htmlFor="hero-job-search" className="block/);
    assert.match(hero, /Sign in or register as a jobseeker to see results\./);
    assert.match(hero, /aria-describedby="hero-job-search-note"/);
    assert.match(hero, /role="search"/);
  });

  it("footer keeps the admin link, heading order, new-tab notes and no placeholder contacts", () => {
    const footer = read(`${HOME}/footer.tsx`);
    assert.match(footer, /href="\/login\/admin"/);
    assert.equal((footer.match(/<h2\b/g) ?? []).length, 3);
    assert.match(footer, /<h3[^>]*>Follow Us<\/h3>/);
    assert.equal(
      (footer.match(/target="_blank"/g) ?? []).length,
      (footer.match(/opens in new tab/g) ?? []).length
    );
    assert.doesNotMatch(footer, /admin@gensanworks\.com|283 889 5200/);
    assert.match(footer, /\{generalSettings\.contactPhone \? \(/);
    assert.match(footer, /\{generalSettings\.contactEmail \? \(/);
  });

  it("landing page has no placeholder contacts and no duplicate summary prefetch", () => {
    const page = read(PAGE);
    assert.doesNotMatch(page, /admin@gensanworks\.com|283 889 5200/);
    assert.doesNotMatch(page, /prefetchQuery|queryKey: \["summary"\]/);
  });

  it("StatCard still announces a missing value as text", () => {
    const src = read("app/components/ui/stat-card.tsx");
    assert.match(src, /<span className="sr-only">Not available<\/span>/);
  });

  it("input placeholders meet text contrast", () => {
    assert.doesNotMatch(read("app/components/ui/input.tsx"), /placeholder:text-slate-(?:300|400)/);
    assert.doesNotMatch(read(`${HOME}/hero-section.tsx`), /placeholder:text-slate-(?:300|400)/);
  });
});

describe("public settings carry no invented contact details", () => {
  it("settings route returns empty contact fields and no official-endorsement wording", () => {
    const route = read("app/api/settings/general/public/route.ts");
    assert.doesNotMatch(route, /admin@gensanworks.com|283 889 5200|Official Job Assistance/);
    assert.match(route, /contactEmail: ""/);
    assert.match(route, /contactPhone: ""/);
  });
});
