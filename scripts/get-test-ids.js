const postgres = require('postgres');
const fs = require('fs');

async function testMatching() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const lines = env.split(/\r?\n/);
    const getVal = (k) => {
      const line = lines.find(l => l.startsWith(k + '='));
      if (!line) return null;
      let val = line.slice(k.length + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      return val;
    };

    const databaseUrl = getVal('DATABASE_URL').replace(':6543', ':5432');
    const sql = postgres(databaseUrl);

    console.log('Fetching test IDs...');
    const seeker = await sql`SELECT id FROM jobseekers LIMIT 1`;
    const job = await sql`SELECT id FROM jobs LIMIT 1`;

    if (!seeker.length || !job.length) {
      console.error('No seekers or jobs found in DB.');
      process.exit(1);
    }

    const jobseekerId = seeker[0].id;
    const jobId = job[0].id;

    console.log(`Testing match for Jobseeker ${jobseekerId} and Job ${jobId}`);

    // Trigger matching via internal function call (simulating API)
    // We need to set environment variables for the agent to work
    process.env.GROQ_API_KEY = getVal('GROQ_API_KEY');
    process.env.NEXT_PUBLIC_SUPABASE_URL = getVal('NEXT_PUBLIC_SUPABASE_URL');
    process.env.SUPABASE_SERVICE_ROLE_KEY = getVal('SUPABASE_SERVICE_ROLE_KEY');

    // We can't easily import the TS agent in a plain JS script without tsx
    // So we'll use a shell command to run a small TS script
  } catch (err) {
    console.error(err);
  }
}

testMatching();
