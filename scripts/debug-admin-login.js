const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const getVal = (k) => {
  const line = lines.find(l => l.startsWith(k + '='));
  return line ? line.slice(k.length + 1).replace(/^"|"$/g, '') : null;
};

const supabaseUrl = getVal('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

console.log('=== Step 1: Environment Check ===');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('ANON_KEY exists:', !!supabaseAnonKey);

console.log('\n=== Step 2: Direct Supabase Query ===');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

supabase
  .from('admins')
  .select('id, email, password_hash')
  .eq('email', 'admin@gensanworks.com')
  .single()
  .then(result => {
    console.log('Query success:', result.success);
    if (result.error) {
      console.log('Query error:', result.error);
    } else {
      console.log('Admin found:', JSON.stringify(result.data, null, 2));
      
      const hash = result.data.password_hash;
      console.log('\n=== Step 3: Password Verify ===');
      console.log('Stored hash:', hash);
      
      return bcrypt.compare('Admin@123456', hash);
    }
  })
  .then(match => {
    console.log('Password matches:', match);
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
