// scripts/seed-test-accounts.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  content.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) {
      vars[key.trim()] = val.join('=').trim().replace(/"/g, '').replace(/'/g, '');
    }
  });
  return vars;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  const users = [
    { 
      email: 'admin_v3@gensanworks.com', 
      password: 'Admin123!', 
      role: 'admin', 
      metadata: { full_name: 'System Admin' } 
    },
    { 
      email: 'employer_v3@gensanworks.com', 
      password: 'Employer123!', 
      role: 'employer', 
      metadata: { establishment_name: 'PESO Test Employer', industry: 'Services' } 
    },
    { 
      email: 'jobseeker_v3@gensanworks.com', 
      password: 'Jobseeker123!', 
      role: 'jobseeker', 
      metadata: { first_name: 'Test', last_name: 'Jobseeker', barangay: 'Lagao' } 
    }
  ];

  console.log('--- Seeding Test Accounts V3 (Full Metadata) ---');

  for (const u of users) {
    console.log(`Creating ${u.email}...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { ...u.metadata, role: u.role }
    });

    if (error) console.error(`Error creating ${u.email}:`, error.message);
    else console.log(`✅ Successfully created ${u.email}`);
  }
}

seed();
