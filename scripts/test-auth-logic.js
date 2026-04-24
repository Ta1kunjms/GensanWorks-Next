const fs = require('fs');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const getVal = (k) => {
  const line = lines.find(l => l.startsWith(k + '='));
  return line ? line.slice(k.length + 1).trim() : null;
};

const supabaseUrl = getVal('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getVal('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceKey);

async function testAuth() {
  const email = 'admin@gensanworks.gov';
  const role = 'admin';
  const password = 'Admin@123456';
  
  const emailLower = email.toLowerCase();
  const table = 'admins';
  const { data, error } = await supabase
    .from(table)
    .select('id, email, name, password_hash, profile_image')
    .eq('email', emailLower)
    .single();

  if (error || !data) {
    console.log('User not found or error:', error);
    return;
  }

  console.log('User data:', data);

  const passwordMatch = await bcrypt.compare(password, data.password_hash);
  console.log('Password match:', passwordMatch);
}

testAuth();
