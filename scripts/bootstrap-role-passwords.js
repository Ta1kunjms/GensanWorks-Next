#!/usr/bin/env node
/*
  Bootstraps password hashes for records that are missing or clearly invalid.

  Usage:
    node scripts/bootstrap-role-passwords.js

  Optional env overrides:
    BOOTSTRAP_ADMIN_EMAIL=admin@gensanworks.com
    BOOTSTRAP_ADMIN_PASSWORD=Admin123!
    BOOTSTRAP_EMPLOYER_PASSWORD=Employer123!
    BOOTSTRAP_JOBSEEKER_PASSWORD=Jobseeker123!
*/
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const postgres = require("postgres");

function readEnvFileValue(key) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(`${key}=`.length).replace(/^"|"$/g, "");
}

function loadDatabaseUrl() {
  return process.env.DATABASE_URL || readEnvFileValue("DATABASE_URL");
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL was not found in env or .env.local");
    process.exit(1);
  }

  const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@gensanworks.com").toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123!";
  const employerPassword = process.env.BOOTSTRAP_EMPLOYER_PASSWORD || "Employer123!";
  const jobseekerPassword = process.env.BOOTSTRAP_JOBSEEKER_PASSWORD || "Jobseeker123!";
  const revealPasswords = process.env.BOOTSTRAP_REVEAL_PASSWORDS === "true";

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const adminHash = await hashPassword(adminPassword);
    const employerHash = await hashPassword(employerPassword);
    const jobseekerHash = await hashPassword(jobseekerPassword);

    const adminResult = await sql`
      update admins
      set password_hash = ${adminHash}, updated_at = now()
      where lower(email) = ${adminEmail}
      returning id, email
    `;

    const employerResult = await sql`
      update employers
      set password_hash = ${employerHash}, updated_at = now()
      where password_hash is null or length(password_hash) < 30
      returning id, email
    `;

    const userResult = await sql`
      update users
      set password_hash = ${jobseekerHash}, updated_at = now()
      where password_hash is null or length(password_hash) < 30
      returning id, email
    `;

    const summary = {
      adminReset: adminResult.length,
      employersBootstrapped: employerResult.length,
      usersBootstrapped: userResult.length,
    };

    console.log("Bootstrap complete:", summary);
    if (!adminResult.length) {
      console.log(`Note: admin email not found -> ${adminEmail}`);
    }

    console.log("Temporary credentials used for bootstrapped accounts:");
    if (revealPasswords) {
      console.log(`- admin (${adminEmail}): ${adminPassword}`);
      console.log(`- employers (all missing/invalid): ${employerPassword}`);
      console.log(`- jobseekers (all missing/invalid): ${jobseekerPassword}`);
    } else {
      console.log(`- admin (${adminEmail}): [redacted]`);
      console.log("- employers (all missing/invalid): [redacted]");
      console.log("- jobseekers (all missing/invalid): [redacted]");
      console.log("Set BOOTSTRAP_REVEAL_PASSWORDS=true to print plaintext values.");
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error("Bootstrap failed:", error?.message || error);
  process.exit(1);
});
