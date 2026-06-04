const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const getVal = (k) => {
  const line = env.split(/\r?\n/).find(l => l.startsWith(k + '='));
  if (!line) return null;
  let val = line.slice(k.length + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val;
};

const supabaseUrl = getVal('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getVal('SUPABASE_SERVICE_ROLE_KEY');

// Must use service role key to list auth users
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('Fetching Supabase Auth users...');
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 20 });
  if (error) {
    console.error('Error fetching auth users:', error);
  } else {
    console.log(`Total auth users: ${data.users.length}`);
    for (const u of data.users) {
      console.log(`  ${u.email} | role: ${u.user_metadata?.role} | confirmed: ${!!u.email_confirmed_at}`);
    }
  }
}

main();
