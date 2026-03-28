#!/usr/bin/env node
/*
  Usage:
    node scripts/reset-admin-password.js <email> <newPassword>

  Example:
    node scripts/reset-admin-password.js admin@gensanworks.com "Admin123!"
*/
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const postgres = require("postgres");

function loadDatabaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return null;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const line = lines.find((l) => l.startsWith("DATABASE_URL="));
  if (!line) return null;

  return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
}

async function main() {
  const [, , emailArg, passwordArg] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error("Usage: node scripts/reset-admin-password.js <email> <newPassword>");
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const password = String(passwordArg);

  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL was not found in env or .env.local");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await sql`
      update admins
      set password_hash = ${hash}, updated_at = now()
      where lower(email) = ${email}
      returning id, email
    `;

    if (!result.length) {
      console.error(`No admin found for email: ${email}`);
      process.exit(1);
    }

    console.log(`Password reset successful for ${result[0].email}`);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error("Password reset failed:", error?.message || error);
  process.exit(1);
});
