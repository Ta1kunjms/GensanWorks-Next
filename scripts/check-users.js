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

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('Fetching admins password info...');
  const { data: admins, error } = await supabase.from('admins').select('id, email, password_hash');
  if (error) console.error(error);
  else console.log(admins);
}

main();
