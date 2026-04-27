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
async function checkData() {
  const { data, error } = await supabase.from('jobseekers').select('email, city, province, employment_type, house_number, barangay').in('email', ['jobseeker_v3@gensanworks.com', 'jobseeker@example.com']);
  console.log('Results:', JSON.stringify(data, null, 2));
}
checkData();
