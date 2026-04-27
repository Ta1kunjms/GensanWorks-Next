// Run SRS migration via Supabase admin client
// Usage: node scripts/run-migration.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tsvioxrlmcsqdricdgkd.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmlveHJsbWNzcWRyaWNkZ2tkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0MzU5MiwiZXhwIjoyMDkwMTE5NTkyfQ.xELdcrmfJ30d6YNa64SFEKjyX6U-k6FkZ4K5W8zzG0A";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const migrations = [
  // ─── employers table ───
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS geographic_code TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS barangay_chairperson TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS barangay_secretary TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS industry_code TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS company_tax_id TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS total_paid_employees INTEGER DEFAULT 0`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS total_vacant_positions INTEGER DEFAULT 0`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS srs_subscriber_intent BOOLEAN DEFAULT TRUE`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS srs_prepared_by TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS srs_prepared_designation TEXT`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS srs_prepared_date DATE`,
  `ALTER TABLE employers ADD COLUMN IF NOT EXISTS srs_prepared_contact TEXT`,

  // ─── jobs table ───
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_contract_type TEXT CHECK (employment_contract_type IN ('P', 'T', 'C'))`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS industry_code TEXT`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS age_preference_min INTEGER`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS age_preference_max INTEGER`,
];

let passed = 0;
let failed = 0;

for (const sql of migrations) {
  const short = sql.replace("ALTER TABLE ", "").split(" ADD COLUMN")[0];
  const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] ?? "?";
  try {
    const { error } = await supabase.rpc("exec_sql", { query: sql }).maybeSingle();
    if (error && error.message.includes("already exists")) {
      console.log(`  ⚠  ${short}.${col} — already exists (skipped)`);
    } else if (error) {
      // Try direct via REST (exec_sql may not exist — use pg connection instead)
      console.log(`  ✗  ${short}.${col} — ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓  ${short}.${col}`);
      passed++;
    }
  } catch (e) {
    console.log(`  ✗  ${short}.${col} — ${e.message}`);
    failed++;
  }
}

console.log(`\nDone: ${passed} applied, ${failed} failed.`);
if (failed > 0) {
  console.log("\nRun the SQL manually in Supabase SQL Editor:");
  console.log("  https://supabase.com/dashboard/project/tsvioxrlmcsqdricdgkd/sql/new");
  console.log("  Paste the contents of: scripts/srs-migration.sql");
  process.exit(1);
}
