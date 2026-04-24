const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function clearTable(tableName) {
  console.log(`Clearing ${tableName}...`);
  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
  
  if (error) console.error(`Error clearing ${tableName}:`, error.message);
}

async function clearDatabase() {
  console.log('--- Database Cleanup Started (HTTPS) ---');

  // Tables to clear in order (to handle FKs)
  const tables = [
    'admin_activity_logs',
    'applications',
    'job_postings',
    'jobseeker_education',
    'jobseeker_experience',
    'jobseeker_training',
    'jobseeker_languages',
    'jobseeker_licenses',
    'employer_branches',
    'jobseekers',
    'employers',
    'admins'
  ];

  for (const table of tables) {
    await clearTable(table);
  }

  console.log('--- Database Cleanup Completed ---');
}

clearDatabase();
