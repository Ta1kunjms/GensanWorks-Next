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
    console.log("Connecting to Supabase via HTTP client...");
    const supabase = createClient(url, key);

    const migrationPath = path.join(process.cwd(), "scripts", "migrations", "20260424_add_audit_logs.sql");
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const sqlContent = fs.readFileSync(migrationPath, "utf8");
    console.log("Executing SQL migration via run_sql RPC...");
    
    const { data, error } = await supabase.rpc("run_sql", {
      sql_query: sqlContent
    });

    if (error) {
      console.error("RPC Error:", error.message);
    } else {
      console.log("Migration executed successfully!", data);
    }
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

main();
