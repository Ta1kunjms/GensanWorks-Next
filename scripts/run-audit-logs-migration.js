const { Client } = require("pg");
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
  // Use the direct (non-pooler) connection string from the environment; never hardcode credentials.
  const originalUrl = getDbUrl();
  const directUrl = process.env.DIRECT_DATABASE_URL || originalUrl;
  
  console.log("Connecting with pg to direct host:", directUrl.split("@")[1]);
  
  const client = new Client({
    connectionString: directUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const migrationPath = path.join(process.cwd(), "scripts", "migrations", "20260424_add_audit_logs.sql");
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const sqlContent = fs.readFileSync(migrationPath, "utf8");
    console.log("Running migration...");
    await client.query(sqlContent);
    console.log("Migration executed successfully! audit_logs table created.");

  } catch (err) {
    console.error("Database connection/execution error:", err);
  } finally {
    await client.end();
  }
}

main();
