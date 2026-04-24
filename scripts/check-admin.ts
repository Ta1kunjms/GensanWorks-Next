const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

(async () => {
  const { data, error } = await supabase.from('admins').select('id, email, name, password_hash');
  console.log('=== Admins in database ===');
  console.log(JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error.message);
  
  // Check with a different approach - what columns exist
  const { data: sample } = await supabase.from('admins').select('*').limit(1).single();
  console.log('=== Admin schema ===');
  console.log(Object.keys(sample || {}).join(', '));
})();