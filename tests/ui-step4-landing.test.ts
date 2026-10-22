// UI cleanup Step 4: landing page reduced to 7 sections, fabricated numbers and claims
// removed, numbers section limited to /api/summary fields, and basic landmarks/a11y.
// Static source checks, same style as tests/ui-step3.test.ts.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const PAGE = "app/page.tsx";

// Homepage components that app/page.tsx still renders.
const RENDERED = [
  "app/components/homepage/header.tsx",
  "app/components/homepage/hero-section.tsx",
  "app/components/homepage/job-categories-section.tsx",
  "app/components/homepage/how-it-works-section.tsx",
  "app/components/homepage/skills-demand-section.tsx",
  "app/components/homepage/impact-metrics-section.tsx",
  "app/components/homepage/faq-section.tsx",
  "app/components/homepage/footer.tsx",
];

const BANNED_STRINGS = [
  "94%",
  "94.5%",
  "+15%",
  "450+",
  "120+",
  "₱32",
  "48 hrs",
  "48h",
  "48 hours",
  "25 years",
  "25+ Years",
  "100% Verified",
  "ISO-aligned",
  "Government Certified",
  "10,000+",
];

describe("landing page shows no fabricated numbers or claims", () => {
  for (const file of [PAGE, ...RENDERED]) {
    it(file, () => {
      const src = read(file);
      for (const banned of BANNED_STRINGS) {
        assert.ok(!src.includes(banned), `${file} still contains "${banned}"`);
      }
      assert.doesNotMatch(src, /Realtime/, `${file} labels cached numbers as realtime`);
    });
  }

  it("page.tsx has no invented skill-demand fallback values", () => {
    const src = read(PAGE);
    assert.doesNotMatch(src, /defaultSkillsData/);
    assert.doesNotMatch(src, /percentage: \d+/);
  });

  it("FAQ describes matching as assistance with human decisions", () => {
    const src = read(PAGE);
    assert.match(src, /AI-assisted suggestions/);
    assert.match(src, /PESO staff and employers make the decisions/);
    assert.doesNotMatch(src, /AI-powered|intelligent matching/i);
  });
});

describe("rendered homepage components use the plain visual language", () => {
  for (const file of RENDERED) {
    it(file, () => {
      const src = read(file);
      assert.doesNotMatch(src, /bg-clip-text/);
      assert.doesNotMatch(src, /bg-gradient-to-/);
      assert.doesNotMatch(src, /(?<![\w-])blur-(?:sm|md|lg|xl|2xl|3xl|\[)/);
      assert.doesNotMatch(src, /backdrop-blur/);
      assert.doesNotMatch(src, /font-(?:black|extrabold|light)/);
      assert.doesNotMatch(src, /rounded-(?:[trblse]{1,2}-)?(?:xl|2xl|3xl|\[)/);
      assert.doesNotMatch(src, /tracking-\[0\.|tracking-widest/);
      assert.doesNotMatch(src, /hover:scale-|group-hover:scale-/);
      assert.doesNotMatch(src, /onMouseEnter|onMouseMove/);
      assert.doesNotMatch(src, /\b(?:Sparkles|Wand2|Bot|BrainCircuit|Brain)\b/);
      assert.doesNotMatch(src, /text-slate-(?:300|400)/);
      assert.doesNotMatch(src, /<button\b/);
    });
  }
});

describe("landing page renders 7 sections", () => {
  const src = read(PAGE);

  it("renders the kept sections in order", () => {
    const order = [
      "<Header",
      "<HeroSection",
      "<JobCategoriesSection",
      "<HowItWorksSection",
      "<SkillsDemandSection",
      "<ImpactMetricsSection",
      "<FaqSection",
      "<Footer",
    ].map((tag) => src.indexOf(tag));
    for (const index of order) assert.ok(index > -1);
    assert.deepEqual([...order].sort((a, b) => a - b), order);
  });

  it("no longer renders the removed sections or the newsletter", () => {
    for (const removed of [
      "WhyChooseUsSection",
      "ExperienceSection",
      "TestimonialsSection",
      "VideoSection",
      "PartnersSection",
      "NewsSection",
      "SkillsShortageSection",
      "CallToActionSection",
      "ServicesSection",
    ]) {
      assert.ok(!src.includes(removed), `${removed} is still referenced`);
    }
    assert.doesNotMatch(src, /handleNewsletterSubmit|Newsletter/i);
    assert.doesNotMatch(src, /\/api\/public\/impact/);
  });

  it("services content stays reachable at /#services inside How it works", () => {
    const how = read("app/components/homepage/how-it-works-section.tsx");
    assert.match(how, /id="how-it-works"/);
    assert.match(how, /id="services"/);
  });
});

describe("numbers section", () => {
  const src = read("app/components/homepage/impact-metrics-section.tsx");

  it("uses StatCard and formatCount", () => {
    assert.match(src, /<StatCard\b/);
    assert.match(src, /formatCount\(/);
  });

  it("labels the data as demo data with an as-of date", () => {
    assert.match(src, /Demo data · as of /);
  });

  it("shows only /api/summary fields, without growth or invented metrics", () => {
    for (const field of ["totalApplicants", "activeEmployers", "successfulReferrals"]) {
      assert.match(src, new RegExp(field));
    }
    assert.doesNotMatch(src, /growth|satisfaction|avgSalary|avgTimeToInterview|yearsOfService/i);
  });

  it("labour-market snapshot is labelled as demo data and has no fallback values", () => {
    const snapshot = read("app/components/homepage/skills-demand-section.tsx");
    assert.match(snapshot, /Demo data · as of /);
    assert.match(snapshot, /rows\.length === 0\) return null/);
    assert.doesNotMatch(snapshot, /percentage: \d+/);
  });

  it("snapshot stays off while /api/landing/skills serves a hard-coded list", () => {
    const route = read("app/api/landing/skills/route.ts");
    const page = read(PAGE);
    if (/percentage: \d+/.test(route)) {
      const query = page.slice(page.indexOf('queryKey: ["landing", "skills"]'));
      assert.match(query.slice(0, query.indexOf("});")), /enabled: false/);
    }
  });

  it("job categories have no placeholder counts", () => {
    assert.doesNotMatch(read("app/components/homepage/job-categories-section.tsx"), /open roles"|defaultJobCategories/);
  });
});

describe("landing accessibility", () => {
  it("has a skip link to <main id=\"main-content\">", () => {
    const header = read("app/components/homepage/header.tsx");
    assert.match(header, /href="#main-content"[\s\S]*?Skip to main content/);
    // The skip link comes before any other link in the header.
    assert.ok(header.indexOf('href="#main-content"') < header.indexOf("<Link"));
    assert.match(read(PAGE), /<main id="main-content"/);
  });

  it("has exactly one h1, in the hero", () => {
    const all = [PAGE, ...RENDERED].map((file) => [file, (read(file).match(/<h1\b/g) ?? []).length] as const);
    const withH1 = all.filter(([, count]) => count > 0);
    assert.deepEqual(withH1, [["app/components/homepage/hero-section.tsx", 1]]);
  });

  it("mobile menu button toggles a real menu", () => {
    const header = read("app/components/homepage/header.tsx");
    assert.match(header, /aria-expanded=\{menuOpen\}/);
    assert.match(header, /aria-controls=\{MOBILE_MENU_ID\}/);
    assert.match(header, /aria-label=\{menuOpen \? "Close menu" : "Open menu"\}/);
    assert.match(header, /onClick=\{\(\) => setMenuOpen/);
    assert.match(header, /id=\{MOBILE_MENU_ID\}/);
  });

  it("FAQ triggers expose their expanded state", () => {
    const faq = read("app/components/homepage/faq-section.tsx");
    assert.match(faq, /aria-expanded=\{isOpen\}/);
    assert.match(faq, /aria-controls=\{panelId\}/);
    assert.match(faq, /hidden=\{!isOpen\}/);
  });

  it("footer keeps the admin portal link", () => {
    assert.match(read("app/components/homepage/footer.tsx"), /href="\/login\/admin"/);
  });
});

describe("Step 4 review fixes", () => {
  it("StatCard announces a missing value as text, not as a dash", () => {
    const src = read("app/components/ui/stat-card.tsx");
    assert.match(src, /<span aria-hidden="true">—<\/span>/);
    assert.match(src, /<span className="sr-only">Not available<\/span>/);
  });

  it("numbers section keeps real zeros", () => {
    assert.match(read("app/components/homepage/impact-metrics-section.tsx"), /value >= 0 \? value : null/);
  });

  it("mobile menu returns focus on Escape and closes on outside click", () => {
    const header = read("app/components/homepage/header.tsx");
    assert.match(header, /toggleRef\.current\?\.focus\(\)/);
    assert.match(header, /addEventListener\("pointerdown"/);
    assert.match(header, /ref=\{toggleRef\}/);
  });

  it("input placeholders meet text contrast", () => {
    const input = read("app/components/ui/input.tsx");
    assert.doesNotMatch(input, /placeholder:text-slate-(?:300|400)/);
  });

  it("hero search has a visible label and says sign-in is needed", () => {
    const hero = read("app/components/homepage/hero-section.tsx");
    assert.doesNotMatch(hero, /htmlFor="hero-job-search" className="sr-only"/);
    assert.match(hero, /Sign in or register as a jobseeker to see results\./);
    assert.match(hero, /aria-describedby="hero-job-search-note"/);
  });

  it("footer headings, new-tab links and contact lines", () => {
    const footer = read("app/components/homepage/footer.tsx");
    assert.equal((footer.match(/<h2\b/g) ?? []).length, 3);
    assert.match(footer, /<h3[^>]*>Follow Us<\/h3>/);
    assert.equal(
      (footer.match(/target="_blank"/g) ?? []).length,
      (footer.match(/opens in new tab/g) ?? []).length
    );
    assert.doesNotMatch(footer, /Accessibility Statement/);
    assert.doesNotMatch(footer, /admin@gensanworks\.com|283 889 5200/);
    assert.match(footer, /\{generalSettings\.contactPhone \? \(/);
    assert.match(footer, /\{generalSettings\.contactEmail \? \(/);
  });

  it("landing page has no placeholder contacts and no duplicate summary prefetch", () => {
    const page = read(PAGE);
    assert.doesNotMatch(page, /admin@gensanworks\.com|283 889 5200/);
    assert.doesNotMatch(page, /prefetchQuery|queryKey: \["summary"\]/);
  });

  it("anchored sections clear the sticky header", () => {
    const how = read("app/components/homepage/how-it-works-section.tsx");
    assert.match(how, /id="how-it-works"[^>]*scroll-mt-24/);
    assert.match(how, /id="services" className="[^"]*scroll-mt-24/);
  });
});
