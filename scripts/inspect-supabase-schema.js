const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnvVars() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  
  const urlMatch = content.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
  const keyMatch = content.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  
  if (!urlMatch || !keyMatch) throw new Error("Missing Supabase URL or service role key in .env.local");
  
  return {
    url: urlMatch[1].trim(),
    key: keyMatch[1].trim()
  };
}

async function main() {
  try {
    const { url, key } = getEnvVars();
    console.log("Connecting to Supabase:", url);
    const supabase = createClient(url, key);

    const tables = ["jobs", "jobseekers", "referrals", "referral_slips", "audit_logs", "applications"];
    for (const t of tables) {
      console.log(`\n--- Inspecting table: ${t} ---`);
      const { data, error } = await supabase.from(t).select("*").limit(1);
      if (error) {
        console.error(`Error querying ${t}:`, error.message);
      } else if (!data || data.length === 0) {
        console.log(`Table ${t} exists but is empty.`);
        // Try to get a single row to see columns, or get columns list if possible.
        // Wait, if it exists but is empty, let's see if we can get the keys of the returned empty array (there are none).
        // Let's do a select of 1 column just to see if it succeeds.
      } else {
        console.log("Keys found:", Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

main();
