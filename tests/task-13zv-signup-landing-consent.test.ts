// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading. Covers Task 13Z-V: the /signup landing
// page (app/signup/page.tsx) must send consentAccepted to both signup APIs,
// which reject payloads without it (see tests/signup-consent-requirement.test.ts).
// A. STATIC SOURCE CHECKS of the consent checkbox, client validation and payloads.
// B. STATIC SOURCE CHECK that the checkbox wording matches app/signup/jobseeker/page.tsx.
// C. STATIC SOURCE CHECK that the Task 13Z-S Google-disabled constraints still hold.
//
// The page itself is not rendered here (client component; no DOM test harness).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8").replace(/\r\n/g, "\n");

const LANDING = "app/signup/page.tsx";
const JOBSEEKER = "app/signup/jobseeker/page.tsx";

function consentLabelBlock(source: string): string {
  const idIndex = source.indexOf('id="consentAccepted"');
  assert.ok(idIndex > 0, "consent checkbox must exist");
  const start = source.lastIndexOf("<label", idIndex);
  const end = source.indexOf("</label>", idIndex);
  assert.ok(start >= 0 && end > idIndex, "consent checkbox must be wrapped in a <label>");
  return source.slice(start, end).replace(/\s+/g, " ").trim();
}

describe("Task 13Z-V — /signup landing page consent", () => {
  describe("A. STATIC SOURCE CHECKS — checkbox, validation, payloads", () => {
    it("static: has an accessible, required consent checkbox linking to /privacy", () => {
      const s = readSource(LANDING);
      assert.match(s, /const \[consentAccepted, setConsentAccepted\] = useState\(false\)/);
      assert.match(s, /type="checkbox"\s+id="consentAccepted"/);
      assert.match(s, /aria-required="true"/);
      assert.match(s, /aria-describedby=\{fieldErrors\.consentAccepted \? "consentAccepted-error" : undefined\}/);
      assert.match(s, /<p id="consentAccepted-error"/);
      assert.match(s, /<Link href="\/privacy"/);
    });

    it("static: client validation blocks submit without consent", () => {
      const s = readSource(LANDING);
      assert.ok(
        s.includes('if (!consentAccepted) nextErrors.consentAccepted = "You must acknowledge the Privacy Notice to continue.";'),
      );
    });

    it("static: both jobseeker and employer payload branches send consentAccepted", () => {
      const s = readSource(LANDING);
      const start = s.indexOf("const payload =");
      const end = s.indexOf("const response = await fetch(", start);
      assert.ok(start > 0 && end > start, "payload construction must precede the fetch");
      const payloadBlock = s.slice(start, end);
      const separator = payloadBlock.indexOf(": {");
      assert.ok(separator > 0, "payload must have jobseeker and employer branches");
      const jobseekerBranch = payloadBlock.slice(0, separator);
      const employerBranch = payloadBlock.slice(separator);
      assert.match(jobseekerBranch, /firstName:/);
      assert.match(jobseekerBranch, /\bconsentAccepted,/);
      assert.match(employerBranch, /establishmentName:/);
      assert.match(employerBranch, /\bconsentAccepted,/);
    });
  });

  describe("B. STATIC SOURCE CHECK — wording parity", () => {
    it("static: consent label matches the jobseeker signup page exactly", () => {
      assert.equal(consentLabelBlock(readSource(LANDING)), consentLabelBlock(readSource(JOBSEEKER)));
    });
  });

  describe("C. STATIC SOURCE CHECK — Google sign-up is jobseeker-only and email/password flow intact", () => {
    it("static: Google button is jobseeker-only, redirects to the consent-gated callback, and requests no extra OAuth scopes", () => {
      const s = readSource(LANDING);
      assert.match(s, /provider:\s*["']google["']/);
      assert.match(s, /redirectTo:\s*`\$\{window\.location\.origin\}\/auth\/callback`/);
      assert.match(s, /\{role === "jobseeker" \? \([\s\S]*Continue with Google[\s\S]*\) : null\}/);
      assert.ok(!/access_type|prompt:\s*["']consent["']/.test(s));
      assert.ok(!/auth\/callback\?next=/.test(s));
    });

    it("static: email/password flow intact", () => {
      const s = readSource(LANDING);
      assert.ok(s.includes('"/api/auth/signup/jobseeker"'));
      assert.ok(s.includes('"/api/auth/signup/employer"'));
      assert.match(s, /<form onSubmit=\{handleSubmit\}/);
    });
  });
});
