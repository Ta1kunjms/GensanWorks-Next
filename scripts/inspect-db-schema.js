const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

function getDbUrl() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error("No DATABASE_URL in .env.local");
  let url = match[1].trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  return url;
}

async function main() {
  const dbUrl = getDbUrl();
  console.log("Connecting to:", dbUrl.split("@")[1]);
  const sql = postgres(dbUrl, { ssl: "require" });

  try {
    console.log("\n--- PUBLIC TABLES ---");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(tables.map(t => t.table_name).join(", "));

    const inspectTables = ["jobs", "jobseekers", "referrals", "referral_slips", "audit_logs"];
    for (const t of inspectTables) {
      console.log(`\n--- COLUMNS FOR ${t.toUpperCase()} ---`);
      try {
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = ${t} AND table_schema = 'public'
          ORDER BY column_name;
        `;
        if (columns.length === 0) {
          console.log("(Table does not exist)");
        } else {
          console.log(columns.map(c => `${c.column_name} (${c.data_type})`).join(", "));
        }
      } catch (err) {
        console.error(`Error querying ${t}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await sql.end();
  }
}

main();
