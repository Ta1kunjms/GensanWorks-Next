const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local to get DATABASE_URL
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

async function clearDatabase() {
  const sql = postgres(dbUrl);

  console.log('--- Database Cleanup Started ---');

  try {
    console.log('Truncating tables...');
    await sql`
      TRUNCATE TABLE 
        jobseekers, 
        employers, 
        admins,
        job_postings,
        applications,
        jobseeker_education,
        jobseeker_experience,
        jobseeker_training,
        jobseeker_languages,
        jobseeker_licenses,
        employer_branches,
        admin_activity_logs
      RESTART IDENTITY CASCADE
    `;

    console.log('Attempting to clear auth.users...');
    try {
      await sql`TRUNCATE auth.users CASCADE`;
      console.log('auth.users cleared successfully.');
    } catch (authErr) {
      console.warn('Note: Could not truncate auth.users directly. Standard in Supabase if not superuser.');
    }

    console.log('--- Database Cleanup Completed Successfully ---');
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await sql.end();
  }
}

clearDatabase();
