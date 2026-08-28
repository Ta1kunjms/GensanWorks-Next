/**
 * seed-skill-synonyms.ts
 * 
 * One-time seeding script for the skill_synonyms table.
 * 
 * Calls the Groq LLM to generate a comprehensive synonym map for common
 * skill terms used in the Philippine labor market (IT, Healthcare,
 * Vocational, Finance, Admin, Retail domains).
 * 
 * Run once with: npx tsx scripts/seed-skill-synonyms.ts
 * Re-run periodically to expand coverage as new skills emerge.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEYS?.split(",")[0]?.trim() });

const SKILL_DOMAINS = [
  // IT & Software
  "React.js, Vue.js, Angular, Node.js, Python, Java, TypeScript, JavaScript, PHP, C++, SQL, PostgreSQL, MySQL, MongoDB, Redis, Docker, Kubernetes, AWS, Azure, Git, REST API, GraphQL, Machine Learning, Data Science, Cybersecurity, Network Administration, Linux, Windows Server",
  // Microsoft Office & Productivity
  "Microsoft Excel, Microsoft Word, Microsoft PowerPoint, Microsoft Access, Microsoft Outlook, Google Sheets, Google Docs, LibreOffice, OpenOffice",
  // Healthcare
  "Patient Care, First Aid, CPR, Nursing, Medical Records, Vital Signs Monitoring, Wound Care, IV Therapy, Medication Administration, Health Assessment",
  // Finance & Accounting
  "Bookkeeping, Accounting, Financial Reporting, Payroll, Accounts Payable, Accounts Receivable, Auditing, Tax Preparation, QuickBooks, SAP",
  // Admin & Office
  "Office Management, Data Entry, Filing, Scheduling, Customer Service, Receptionist, Secretarial, Documentation, Record Keeping, Typing",
  // Vocational & Technical
  "Electrical Wiring, Plumbing, Welding, Carpentry, Electrical Troubleshooting, HVAC, Automotive Repair, Heavy Equipment Operation, PLC Programming",
  // Sales & Retail
  "Sales, Customer Service, Cashiering, Inventory Management, Merchandising, Point of Sale, Product Knowledge, Upselling",
  // Communication & Soft Skills
  "Communication, Teamwork, Leadership, Problem Solving, Time Management, Critical Thinking, Adaptability, Multitasking, Work Ethic, Attention to Detail",
];

async function generateSynonymsForDomain(skillList: string): Promise<{ alias: string; canonical: string; confidence: number }[]> {
  const prompt = `You are a skills normalization AI for a Philippine job matching platform.

For each skill in this list, generate all common aliases, abbreviations, misspellings, and synonymous terms that job seekers might use.

SKILL LIST: ${skillList}

Return ONLY a valid JSON array. Each object must have:
- "canonical": the standard full skill name (lowercase)
- "alias": a variant form (lowercase, different from canonical)
- "confidence": float 0.0–1.0 how confident you are this is a valid synonym

Example format:
[
  {"canonical": "microsoft excel", "alias": "ms excel", "confidence": 1.0},
  {"canonical": "microsoft excel", "alias": "excel", "confidence": 0.95},
  {"canonical": "customer service", "alias": "customer relations", "confidence": 0.90}
]

Return ONLY the JSON array, no explanation, no markdown.`;

    const model = process.env.GROQ_PRIMARY_MODEL || "openai/gpt-oss-20b";
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";

    // Strip markdown code blocks if present
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Groq generation failed for domain:", err);
    return [];
  }
}

async function seedSynonyms() {
  console.log("=== Skill Synonym Seeder ===");
  console.log("Generating AI synonyms via Groq...\n");

  const allSynonyms: { alias: string; canonical: string; confidence: number; source: string }[] = [];

  for (let i = 0; i < SKILL_DOMAINS.length; i++) {
    const domain = SKILL_DOMAINS[i];
    console.log(`[${i + 1}/${SKILL_DOMAINS.length}] Processing domain...`);
    const synonyms = await generateSynonymsForDomain(domain!);
    const valid = synonyms.filter(s =>
      s.alias && s.canonical &&
      s.alias.trim() !== s.canonical.trim() &&
      s.alias.length > 0 && s.canonical.length > 0
    );
    console.log(`  → Generated ${valid.length} synonym pairs`);
    allSynonyms.push(...valid.map(s => ({
      alias: s.alias.toLowerCase().trim(),
      canonical: s.canonical.toLowerCase().trim(),
      confidence: s.confidence ?? 0.9,
      source: "ai",
    })));
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nTotal synonyms generated: ${allSynonyms.length}`);
  console.log("Upserting into Supabase...");

  // Batch upsert in chunks of 100
  const CHUNK_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < allSynonyms.length; i += CHUNK_SIZE) {
    const chunk = allSynonyms.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("skill_synonyms")
      .upsert(chunk, { onConflict: "alias" });

    if (error) {
      console.error(`  ❌ Chunk ${i}–${i + CHUNK_SIZE} failed:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`  ✅ Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${inserted} total)`);
    }
  }

  console.log(`\n🎉 Done! ${inserted} synonym pairs saved to skill_synonyms table.`);
  console.log("The scoring engine will load these automatically on next restart.");
}

seedSynonyms().catch(console.error);
