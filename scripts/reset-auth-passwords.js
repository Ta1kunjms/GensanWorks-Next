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

async function resetAuthUserPassword(email, newPassword) {
  // Find user by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 500 });
  if (listErr) {
    console.error('Could not list users:', listErr);
    return false;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log(`User not found: ${email}`);
    return false;
  }
  
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  });
  
  if (error) {
    console.error(`Failed to update ${email}:`, error.message);
    return false;
  }
  
  console.log(`✅ Password updated for: ${email}`);
  return true;
}

async function main() {
  console.log('Resetting Supabase Auth passwords for test accounts...\n');

  // Reset admin accounts
  await resetAuthUserPassword('admin@gensanworks.com', 'Admin123!');
  await resetAuthUserPassword('admin@example.com', 'Admin123!');
  await resetAuthUserPassword('admin_v3@gensanworks.com', 'Admin123!');
  await resetAuthUserPassword('admin_test@gensanworks.com', 'Admin123!');

  // Reset employer accounts  
  await resetAuthUserPassword('employer1@gmail.com', 'Employer123!');
  await resetAuthUserPassword('taikun.merchandise@gmail.com', 'Employer123!');
  
  // Reset jobseeker accounts
  await resetAuthUserPassword('jobseeker1@gmail.com', 'Jobseeker123!');
  await resetAuthUserPassword('jaysal@gmail.com', 'Jobseeker123!');
  await resetAuthUserPassword('tycoonjamesaflores@gmail.com', 'Jobseeker123!');
  await resetAuthUserPassword('tycoonjamesflores@gmail.com', 'Jobseeker123!');
  await resetAuthUserPassword('drco.pesogensan@gmail.com', 'Admin123!');

  console.log('\nDone! Test credentials:');
  console.log('  Admin:     admin@gensanworks.com / Admin123!');
  console.log('  Employer:  employer1@gmail.com / Employer123!');
  console.log('  Jobseeker: jobseeker1@gmail.com / Jobseeker123!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
