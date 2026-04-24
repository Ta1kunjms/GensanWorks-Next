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

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function diagnose() {
  console.log('\n==========================================');
  console.log('  AUTH DIAGNOSIS');
  console.log('==========================================\n');

  // ---- ADMINS ----
  console.log('--- ADMINS TABLE ---');
  const { data: admins, error: adminErr } = await supabase
    .from('admins')
    .select('id, email, name, password_hash')
    .limit(10);
  if (adminErr) {
    console.log('ERROR querying admins:', adminErr.message);
  } else if (!admins || admins.length === 0) {
    console.log('⚠️  NO ROWS found in admins table.');
  } else {
    for (const a of admins) {
      const hasHash = !!a.password_hash;
      const hashLen = a.password_hash ? a.password_hash.length : 0;
      const isBcrypt = a.password_hash ? a.password_hash.startsWith('$2') : false;
      console.log(`  email: ${a.email}`);
      console.log(`  name: ${a.name}`);
      console.log(`  has password_hash: ${hasHash} | length: ${hashLen} | is bcrypt: ${isBcrypt}`);
      if (isBcrypt) {
        const match = await bcrypt.compare('Admin@123456', a.password_hash).catch(() => false);
        const match2 = await bcrypt.compare('admin123', a.password_hash).catch(() => false);
        console.log(`  matches 'Admin@123456': ${match}`);
        console.log(`  matches 'admin123': ${match2}`);
      }
      console.log('');
    }
  }

  // ---- EMPLOYERS ----
  console.log('--- EMPLOYERS TABLE ---');
  const { data: employers, error: empErr } = await supabase
    .from('employers')
    .select('id, email, name, password_hash')
    .limit(5);
  if (empErr) {
    console.log('ERROR querying employers:', empErr.message);
  } else if (!employers || employers.length === 0) {
    console.log('⚠️  NO ROWS found in employers table.');
  } else {
    for (const e of employers) {
      const hasHash = !!e.password_hash;
      const isBcrypt = e.password_hash ? e.password_hash.startsWith('$2') : false;
      console.log(`  email: ${e.email} | has_hash: ${hasHash} | is_bcrypt: ${isBcrypt}`);
    }
    console.log('');
  }

  // ---- USERS (jobseekers) ----
  console.log('--- USERS TABLE (jobseekers) ---');
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, email, name, password_hash')
    .limit(5);
  if (userErr) {
    console.log('ERROR querying users:', userErr.message);
  } else if (!users || users.length === 0) {
    console.log('⚠️  NO ROWS found in users table.');
  } else {
    for (const u of users) {
      const hasHash = !!u.password_hash;
      const isBcrypt = u.password_hash ? u.password_hash.startsWith('$2') : false;
      console.log(`  email: ${u.email} | has_hash: ${hasHash} | is_bcrypt: ${isBcrypt}`);
    }
    console.log('');
  }

  console.log('==========================================');
  console.log('  DONE');
  console.log('==========================================\n');
}

diagnose().catch(console.error);
