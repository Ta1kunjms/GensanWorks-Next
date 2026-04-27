const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    env[key.trim()] = val.join('=').trim().replace(/"/g, '').replace(/'/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createAccounts() {
  const accounts = [
    { email: 'jobseeker@example.com', password: 'password123', role: 'jobseeker' },
    { email: 'employer@example.com', password: 'password123', role: 'employer' }
  ];
  
  for (const acc of accounts) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: { role: acc.role }
    });

    if (error) {
      console.error(`Error for ${acc.email}:`, error.message);
    } else {
      console.log('Created auth user for', acc.email);
    }
  }
}

createAccounts();
