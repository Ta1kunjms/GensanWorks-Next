#!/usr/bin/env node
/*
  Selects one admin, employer, and jobseeker account, then sets deterministic
  test passwords so authenticated smoke/E2E suites can run consistently.

  Optional env overrides:
    TEST_ADMIN_EMAIL
    TEST_EMPLOYER_EMAIL
    TEST_JOBSEEKER_EMAIL
    TEST_ADMIN_PASSWORD (default: Admin123!)
    TEST_EMPLOYER_PASSWORD (default: Employer123!)
    TEST_JOBSEEKER_PASSWORD (default: Jobseeker123!)
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

async function main() {
  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not found in env or .env.local");
  }

  const adminPassword = process.env.TEST_ADMIN_PASSWORD || "Admin123!";
  const employerPassword = process.env.TEST_EMPLOYER_PASSWORD || "Employer123!";
  const jobseekerPassword = process.env.TEST_JOBSEEKER_PASSWORD || "Jobseeker123!";

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const adminEmail =
      process.env.TEST_ADMIN_EMAIL ||
      (await sql`select email from admins order by created_at asc limit 1`)[0]?.email;
    const employerEmail =
      process.env.TEST_EMPLOYER_EMAIL ||
      (await sql`select email from employers order by created_at asc limit 1`)[0]?.email;
    const jobseekerEmail =
      process.env.TEST_JOBSEEKER_EMAIL ||
      (await sql`select email from users order by created_at asc limit 1`)[0]?.email;

    if (!adminEmail || !employerEmail || !jobseekerEmail) {
      throw new Error("Could not resolve one email per role (admins/employers/users)");
    }

    const [adminHash, employerHash, jobseekerHash] = await Promise.all([
      bcrypt.hash(adminPassword, 10),
      bcrypt.hash(employerPassword, 10),
      bcrypt.hash(jobseekerPassword, 10),
    ]);

    const adminUpdated = await sql`
      update admins
      set password_hash = ${adminHash}, updated_at = now()
      where lower(email) = ${String(adminEmail).toLowerCase()}
      returning email
    `;
    const employerUpdated = await sql`
      update employers
      set password_hash = ${employerHash}, updated_at = now()
      where lower(email) = ${String(employerEmail).toLowerCase()}
      returning email
    `;
    const jobseekerUpdated = await sql`
      update users
      set password_hash = ${jobseekerHash}, updated_at = now()
      where lower(email) = ${String(jobseekerEmail).toLowerCase()}
      returning email
    `;

    console.log(JSON.stringify({
      admin: { email: adminEmail, updated: adminUpdated.length },
      employer: { email: employerEmail, updated: employerUpdated.length },
      jobseeker: { email: jobseekerEmail, updated: jobseekerUpdated.length },
      passwords: {
        admin: adminPassword,
        employer: employerPassword,
        jobseeker: jobseekerPassword,
      },
    }));
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
