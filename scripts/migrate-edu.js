const postgres = require('postgres');
const fs = require('fs');

const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  }
});

const databaseUrl = env.DATABASE_URL.replace(':6543', ':5432');
const sql = postgres(databaseUrl, { ssl: 'require' });

async function run() {
  try {
    console.log('Adding school_name column...');
    await sql`ALTER TABLE jobseeker_education ADD COLUMN IF NOT EXISTS school_name TEXT`;
    console.log('Migration successful: added school_name to jobseeker_education');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}
run();
