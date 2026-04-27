const { createClient } = require('@supabase/supabase-js');
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('jobseeker_education').select('*').limit(1);
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Empty table');
}
run();
