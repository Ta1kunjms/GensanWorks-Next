// UI cleanup P0 Step 5B (branch ui-cleanup): auth and jobseeker pages restyled onto the
// shared primitives. Static source checks: removed visual patterns stay at zero, every
// clickable uses the Button primitive, consent markup is intact, pinned strings remain.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const AUTH_FILES = [
  "app/login/page.tsx",
  "app/signup/page.tsx",
  "app/signup/jobseeker/page.tsx",
  "app/signup/employer/page.tsx",
  "app/auth/consent/page.tsx",
];

const JOBSEEKER_FILES = [
  "app/jobseeker/dashboard/page.tsx",
  "app/jobseeker/profile/page.tsx",
  "app/jobseeker/jobs/page.tsx",
  "app/jobseeker/jobs/[id]/page.tsx",
  "app/jobseeker/applications/page.tsx",
  "app/components/jobseeker/job-card.tsx",
];

const FILES = [...AUTH_FILES, ...JOBSEEKER_FILES];

// Patterns removed by Step 5; none of these files needs an allowlisted exception.
const REMOVED: Record<string, RegExp> = {
  gradient: /bg-gradient-to-/,
  gradientText: /bg-clip-text/,
  backdropBlur: /backdrop-blur/,
  blurOrb: /(?<![\w-])blur-(?:sm|md|lg|xl|2xl|3xl|\[)/,
  coloredGlow: /shadow-[a-z]+-[0-9]{3}/,
  hoverLift: /hover:(?:-?scale|-?translate)|active:scale/,
  largeRadius: /rounded-(?:[trblse]{1,2}-)?(?:2xl|3xl|\[)/,
  heavyWeight: /font-(?:black|extrabold|light)/,
  eyebrow: /\buppercase\b|tracking-(?:wider|widest|\[0\.)/,
  lowContrast: /text-slate-(?:300|400)/,
  tinyText: /text-\[(?:9|10|11)px\]/,
  decorativeMotion: /animate-(?:ping|bounce|pulse)/,
  aiIcon: /\b(?:Sparkles|Wand2|Bot|BrainCircuit|Brain)\b/,
  hexColor: /#[0-9a-fA-F]{3,8}\b/,
  inlineStyle: /style=\{\{/,
  rawButton: /<button\b/,
};

describe("Step 5B: auth and jobseeker pages use the shared visual language", () => {
  for (const file of FILES) {
    const src = read(file);
    for (const [name, pattern] of Object.entries(REMOVED)) {
      it(`${file} has no ${name}`, () => {
        assert.doesNotMatch(src, pattern);
      });
    }
  }

  it("job card no longer imports framer-motion and respects reduced motion", () => {
    const src = read("app/components/jobseeker/job-card.tsx");
    assert.doesNotMatch(src, /framer-motion/);
    assert.doesNotMatch(src, /<motion\./);
    assert.match(src, /motion-(?:safe|reduce):/);
    assert.match(src, /aria-label=\{`Share \$\{job\.positionTitle\}`\}/);
  });

  it("jobseeker pages use PageHeader, StatCard, StatusBadge and EmptyState", () => {
    assert.match(read("app/jobseeker/jobs/page.tsx"), /<PageHeader title="Browse Jobs"/);
    assert.match(read("app/jobseeker/applications/page.tsx"), /<PageHeader title="My Applications"/);
    assert.match(read("app/jobseeker/profile/page.tsx"), /<PageHeader\s+title="Jobseeker Profile"/);
    const dashboard = read("app/jobseeker/dashboard/page.tsx");
    assert.equal((dashboard.match(/<StatCard\b/g) ?? []).length, 6);
    assert.match(dashboard, /<StatusBadge kind="application"/);
    assert.match(dashboard, /<EmptyState/);
    const applications = read("app/jobseeker/applications/page.tsx");
    assert.match(applications, /<StatusBadge kind="application"/);
    assert.match(applications, /<DialogTitle/);
  });

  it("recommendations are labelled as AI-assisted suggestions without accuracy claims", () => {
    const src = read("app/jobseeker/dashboard/page.tsx");
    assert.match(src, /AI-assisted suggestions/);
    assert.doesNotMatch(src, /perfect match|\baccurate\b|guaranteed/i);
  });

  it("dashboard keeps the Step 3 error and retry behaviour", () => {
    const src = read("app/jobseeker/dashboard/page.tsx");
    assert.match(src, /<ErrorState/);
    assert.match(src, /focusAfterRetryRef\.current = true;/);
    assert.match(src, /tabIndex=\{-1\}/);
    assert.doesNotMatch(src, /error\.message|err\.message/);
  });
});

describe("Step 5B: consent markup is untouched (pilot constraint #4)", () => {
  // The login page has no consent checkbox; these four pages do.
  for (const file of AUTH_FILES.filter((f) => f !== "app/login/page.tsx")) {
    it(`${file} keeps the privacy acknowledgement checkbox`, () => {
      assert.match(read(file), /id="privacy-ack"/);
    });
  }

  it("signup landing and jobseeker signup keep the required checkbox markup", () => {
    for (const file of ["app/signup/page.tsx", "app/signup/jobseeker/page.tsx"]) {
      const src = read(file);
      assert.match(src, /type="checkbox"\s+id="privacy-ack"/, file);
      assert.match(src, /aria-required="true"/, file);
      assert.match(src, /<p id="privacy-ack-error"/, file);
      assert.match(src, /<Link href="\/privacy"/, file);
      assert.match(src, /<form onSubmit=\{handleSubmit\}/, file);
    }
  });

  it("consent page keeps accept, decline, then the visible checkbox", () => {
    const src = read("app/auth/consent/page.tsx");
    const accept = src.indexOf('submit("accept")');
    const decline = src.indexOf('submit("decline")');
    const checkbox = src.indexOf('id="privacy-ack"');
    assert.ok(accept > 0 && decline > accept && checkbox > decline);
    assert.match(src, /h-4 w-4 shrink-0/);
  });
});

describe("Step 5B: strings pinned by e2e and toasts remain", () => {
  const pinned: Array<[string, string]> = [
    ["app/login/page.tsx", '"Sign In"'],
    ["app/login/page.tsx", "Continue with Google"],
    ["app/signup/page.tsx", "Continue with Google"],
    ["app/jobseeker/jobs/page.tsx", "Browse Jobs"],
    ["app/jobseeker/applications/page.tsx", "My Applications"],
    ["app/jobseeker/applications/page.tsx", "Browse Jobs"],
    ["app/jobseeker/jobs/[id]/page.tsx", "Application submitted successfully"],
    ["app/jobseeker/jobs/[id]/page.tsx", "Apply for this position"],
    ["app/jobseeker/profile/page.tsx", "Jobseeker Profile"],
  ];
  for (const [file, text] of pinned) {
    it(`${file} still contains ${text}`, () => {
      assert.ok(read(file).includes(text));
    });
  }

  it("password toggles keep their accessible names", () => {
    for (const file of ["app/login/page.tsx", "app/signup/page.tsx", "app/signup/jobseeker/page.tsx", "app/signup/employer/page.tsx"]) {
      assert.match(read(file), /aria-label=\{show(?:Confirm)?Password \? "Hide password" : "Show password"\}/, file);
    }
  });
});

describe("Step 5 accessibility review fixes (jobseeker and auth)", () => {
  it("job card has no interactive element nested inside its link", () => {
    const src = read("app/components/jobseeker/job-card.tsx");
    // The title link is stretched over the card; Save/Share sit outside the anchor.
    assert.match(src, /<h3[^>]*>\s*<Link\s+href=\{`\/jobseeker\/jobs\/\$\{job\.id\}`\}/);
    assert.match(src, /after:absolute after:inset-0/);
    assert.equal((src.match(/<Link\b/g) ?? []).length, 1);
    const linkBody = src.slice(src.indexOf("<Link"), src.indexOf("</Link>"));
    assert.doesNotMatch(linkBody, /<Button\b|onClick=/);
    assert.equal((src.match(/relative z-10/g) ?? []).length, 2);
    assert.match(src, /onClick=\{handleToggleSave\}/);
    assert.match(src, /onClick=\{handleShare\}/);
  });

  it("login fields have programmatic labels, error wiring and an alert banner", () => {
    const src = read("app/login/page.tsx");
    assert.match(src, /htmlFor="login-email"/);
    assert.match(src, /id="login-email"/);
    assert.match(src, /htmlFor="login-password"/);
    assert.match(src, /id="login-password"/);
    assert.match(src, /aria-invalid=\{fieldErrors\.email \? true : undefined\}/);
    assert.match(src, /aria-describedby=\{fieldErrors\.email \? "login-email-error" : undefined\}/);
    assert.match(src, /<p id="login-email-error"/);
    assert.match(src, /aria-invalid=\{fieldErrors\.password \? true : undefined\}/);
    assert.match(src, /aria-describedby=\{fieldErrors\.password \? "login-password-error" : undefined\}/);
    assert.match(src, /<p id="login-password-error"/);
    assert.match(src, /<div role="alert"[^>]*>\s*\{error\}/);
  });

  it("jobseeker dashboard has a page h1 and the profile prompt is an h2", () => {
    const src = read("app/jobseeker/dashboard/page.tsx");
    assert.match(src, /<PageHeader title="Dashboard"/);
    assert.match(src, /<h2[^>]*>\s*Complete your profile to unlock more jobs/);
    assert.match(src, /<h2 ref=\{headingRef\} tabIndex=\{-1\}/);
    assert.doesNotMatch(src, /<h3[^>]*>\s*Complete your profile/);
  });

  it("job detail form labels are linked and section headings are h2", () => {
    const src = read("app/jobseeker/jobs/[id]/page.tsx");
    assert.match(src, /htmlFor="apply-cover-letter"/);
    assert.match(src, /id="apply-cover-letter"/);
    assert.match(src, /htmlFor="apply-expected-salary"/);
    assert.match(src, /id="apply-expected-salary"/);
    assert.match(src, /<h2[^>]*>Requirements & Skills<\/h2>/);
    assert.match(src, /<h2[^>]*>Job Classification<\/h2>/);
    // Save/Report keep a 44px target below the sm breakpoint.
    assert.equal((src.match(/h-11 gap-2[^"`]*sm:h-9/g) ?? []).length, 2);
  });

  it("application row actions have 44px mobile targets and position-specific names", () => {
    const src = read("app/jobseeker/applications/page.tsx");
    assert.match(src, /aria-label=\{`View application for \$\{application\.positionTitle \|\| "Position"\}`\}/);
    assert.match(src, /aria-label=\{`Job posting for \$\{application\.positionTitle \|\| "Position"\}`\}/);
    assert.match(src, /aria-label=\{`Referral slip for \$\{application\.positionTitle \|\| "Position"\}`\}/);
    assert.ok((src.match(/h-11[^"]*sm:h-9/g) ?? []).length >= 3);
  });
});
