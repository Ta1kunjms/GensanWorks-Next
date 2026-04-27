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
async function testQuery() {
  const { data, error } = await supabase.from('users').select('id, name, email, phone, employment_status, registration_date').eq('role', 'jobseeker');
  console.log('Error:', error);
  console.log('Data length:', data ? data.length : 0);
}
testQuery();
