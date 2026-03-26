#!/usr/bin/env node

/**
 * Import Script: Import CSV Data to Supabase
 * 
 * This script reads exported CSV files and imports them into Supabase PostgreSQL
 * 
 * Usage: npm run migrate:import
 */

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { parse } = require("csv-parse/sync");

function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, "..", fileName);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

// Load local env file for scripts run outside Next.js runtime
loadEnvFile(".env.local");

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const EXPORT_DIR = path.join(__dirname, "../exports");

/**
 * Helper: Parse date strings to ISO format
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Helper: Parse JSON strings
 */
function parseJson(jsonStr) {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function toSnakeCase(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function normalizeKeys(record) {
  const normalized = {};

  for (const [key, value] of Object.entries(record)) {
    normalized[toSnakeCase(key)] = value;
  }

  return normalized;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function getMappedId(idMap, sourceId) {
  if (sourceId === null || sourceId === undefined || sourceId === "") return null;

  const sourceKey = String(sourceId).trim();
  if (!sourceKey) return null;
  if (isUuid(sourceKey)) return sourceKey;

  if (!idMap.has(sourceKey)) {
    idMap.set(sourceKey, randomUUID());
  }

  return idMap.get(sourceKey);
}

/**
 * Import function for each table
 */
async function importTable(tableName, records) {
  if (!records || records.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no records)`);
    return;
  }

  console.log(`📥 Importing ${records.length} records into ${tableName}...`);

  try {
    // Batch insert (Supabase supports bulk upsert)
    const { data, error } = await supabase.from(tableName).insert(records);

    if (error) {
      throw new Error(`${error.message} (${error.code})`);
    }

    console.log(`✅ ${records.length} records imported into ${tableName}`);
  } catch (error) {
    console.error(`❌ Error importing ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Main import function
 */
async function importData() {
  console.log("🚀 Starting data import to Supabase...\n");

  // Check if export files exist
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    console.log("   Run 'npm run migrate:export' first");
    process.exit(1);
  }

  try {
    // Read and parse CSVs
    console.log("📖 Reading CSV files...\n");

    const applicantsFile = path.join(EXPORT_DIR, "applicants.csv");
    const employersFile = path.join(EXPORT_DIR, "employers.csv");
    const jobsFile = path.join(EXPORT_DIR, "jobs.csv");
    const applicationsFile = path.join(EXPORT_DIR, "applications.csv");
    const referralsFile = path.join(EXPORT_DIR, "referrals.csv");

    const applicants = fs.existsSync(applicantsFile)
      ? parse(fs.readFileSync(applicantsFile), { columns: true })
      : [];

    const employers = fs.existsSync(employersFile)
      ? parse(fs.readFileSync(employersFile), { columns: true })
      : [];

    const jobs = fs.existsSync(jobsFile)
      ? parse(fs.readFileSync(jobsFile), { columns: true })
      : [];

    const applications = fs.existsSync(applicationsFile)
      ? parse(fs.readFileSync(applicationsFile), { columns: true })
      : [];

    const referrals = fs.existsSync(referralsFile)
      ? parse(fs.readFileSync(referralsFile), { columns: true })
      : [];

    const userIdMap = new Map();
    const employerIdMap = new Map();
    const jobIdMap = new Map();
    const applicationIdMap = new Map();
    const referralIdMap = new Map();

    for (const row of applicants) getMappedId(userIdMap, row.id);
    for (const row of employers) getMappedId(employerIdMap, row.id);
    for (const row of jobs) getMappedId(jobIdMap, row.id);
    for (const row of applications) getMappedId(applicationIdMap, row.id);
    for (const row of referrals) getMappedId(referralIdMap, row.id);

    console.log(`📊 Found ${applicants.length} applicants`);
    console.log(`📊 Found ${employers.length} employers`);
    console.log(`📊 Found ${jobs.length} jobs`);
    console.log(`📊 Found ${applications.length} applications`);
    console.log(`📊 Found ${referrals.length} referrals\n`);

    // Transform and normalize data
    console.log("🔄 Normalizing data...\n");

    const normalizedApplicants = applicants.map((row) => normalizeKeys({
      ...row,
      id: getMappedId(userIdMap, row.id),
      birthDate: parseDate(row.birthDate),
      registrationDate: parseDate(row.registrationDate),
      nsrpRegistrationDate: parseDate(row.nsrpRegistrationDate),
      profileCompleteness: parseInt(row.profileCompleteness) || 0,
      isFourPS: row.isFourPS === "true" || row.isFourPS === 1,
      isOFW: row.isOFW === "true" || row.isOFW === 1,
      isPWD: row.isPWD === "true" || row.isPWD === 1,
      profileComplete: row.profileComplete === "true" || row.profileComplete === 1,
      isActive: row.isActive === "true" || row.isActive === 1,
      skills: parseJson(row.skills),
      preferredIndustries: parseJson(row.preferredIndustries),
      preferredLocations: parseJson(row.preferredLocations),
      createdAt: parseDate(row.createdAt),
      updatedAt: parseDate(row.updatedAt),
    }));

    const normalizedEmployers = employers.map((row) => normalizeKeys({
      ...row,
      id: getMappedId(employerIdMap, row.id),
      verifiedAt: parseDate(row.verifiedAt),
      createdAt: parseDate(row.createdAt),
      updatedAt: parseDate(row.updatedAt),
      hasAccount: row.hasAccount === "true" || row.hasAccount === 1,
      isActive: row.isActive === "true" || row.isActive === 1,
      isArchived: row.isArchived === "true" || row.isArchived === 1,
      yearsInOperation: parseInt(row.yearsInOperation) || null,
    }));

    const normalizedJobs = jobs.map((row) => normalizeKeys({
      ...row,
      id: getMappedId(jobIdMap, row.id),
      employerId: getMappedId(employerIdMap, row.employerId),
      vacancies: parseInt(row.vacancies) || 1,
      yearsExperience: row.yearsExperience ? parseInt(row.yearsExperience) : null,
      minimumAge: row.minimumAge ? parseInt(row.minimumAge) : null,
      maximumAge: row.maximumAge ? parseInt(row.maximumAge) : null,
      archived: row.archived === "true" || row.archived === 1,
      isPublished: row.isPublished === "true" || row.isPublished === 1,
      isRemote: row.isRemote === "true" || row.isRemote === 1,
      startDate: parseDate(row.startDate),
      endDate: parseDate(row.endDate),
      publishedAt: parseDate(row.publishedAt),
      requiredSkills: parseJson(row.requiredSkills),
      preferredSkills: parseJson(row.preferredSkills),
      benefits: parseJson(row.benefits),
      createdAt: parseDate(row.createdAt),
      updatedAt: parseDate(row.updatedAt),
    }));

    const normalizedApplications = applications.map((row) => normalizeKeys({
      ...row,
      id: getMappedId(applicationIdMap, row.id),
      jobId: getMappedId(jobIdMap, row.jobId),
      applicantId: getMappedId(userIdMap, row.applicantId),
      employerId: getMappedId(employerIdMap, row.employerId),
      matchScore: row.matchScore ? parseFloat(row.matchScore) : null,
      matchInsights: parseJson(row.matchInsights),
      submittedAt: parseDate(row.submittedAt),
      reviewedAt: parseDate(row.reviewedAt),
      interviewDate: parseDate(row.interviewDate),
      createdAt: parseDate(row.createdAt),
      updatedAt: parseDate(row.updatedAt),
    }));

    const normalizedReferrals = referrals.map((row) => normalizeKeys({
      ...row,
      id: getMappedId(referralIdMap, row.id),
      jobId: getMappedId(jobIdMap, row.jobId),
      applicantId: getMappedId(userIdMap, row.applicantId),
      employerId: getMappedId(employerIdMap, row.employerId),
      applicationId: getMappedId(applicationIdMap, row.applicationId),
      dateReferred: parseDate(row.dateReferred),
      createdAt: parseDate(row.createdAt),
      updatedAt: parseDate(row.updatedAt),
    }));

    // Import to Supabase
    console.log("📤 Importing data to Supabase...\n");

    // Import in order (respecting foreign key constraints)
    // 1. Employers first (independent)
    // 2. Users/Applicants second (independent)
    // 3. Jobs third (depends on employers)
    // 4. Applications fourth (depends on jobs, users)
    // 5. Referrals fifth (depends on applications)

    if (normalizedEmployers.length > 0) {
      await importTable("employers", normalizedEmployers);
    }

    if (normalizedApplicants.length > 0) {
      await importTable("users", normalizedApplicants);
    }

    if (normalizedJobs.length > 0) {
      await importTable("jobs", normalizedJobs);
    }

    if (normalizedApplications.length > 0) {
      await importTable("applications", normalizedApplications);
    }

    if (normalizedReferrals.length > 0) {
      await importTable("referrals", normalizedReferrals);
    }

    // Verify data integrity
    console.log("\n✅ Verifying imported data...\n");

    const [usersCount, employersCount, jobsCount, applicationsCount, referralsCount] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("employers").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("referrals").select("*", { count: "exact", head: true }),
    ]);

    console.log("📊 Final Data Counts:");
    console.log(`   Users: ${usersCount.count}`);
    console.log(`   Employers: ${employersCount.count}`);
    console.log(`   Jobs: ${jobsCount.count}`);
    console.log(`   Applications: ${applicationsCount.count}`);
    console.log(`   Referrals: ${referralsCount.count}`);

    console.log("\n✨ Import complete! Data is now in Supabase.");
    console.log("💡 Next: Run migrations with 'npm run db:push'");
  } catch (error) {
    console.error("\n❌ Import failed:", error.message);
    process.exit(1);
  }
}

// Run import
importData();
