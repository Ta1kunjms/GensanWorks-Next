#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

function readEnvFileValue(key) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(`${key}=`.length).replace(/^"|"$/g, "");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || readEnvFileValue("DATABASE_URL");
  if (!databaseUrl) throw new Error("DATABASE_URL not found");

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const published = await sql`
      select id from jobs
      where is_published = true and archived = false
      order by created_at desc
      limit 1
    `;

    if (published[0]?.id) {
      console.log(String(published[0].id));
      return;
    }

    const fallback = await sql`
      select id from jobs
      where archived = false
      order by created_at desc
      limit 1
    `;

    if (!fallback[0]?.id) {
      throw new Error("No jobs found in database");
    }

    console.log(String(fallback[0].id));
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
