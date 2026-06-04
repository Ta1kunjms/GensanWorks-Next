#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

function readEnvFileValue(key) {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return undefined;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(`${key}=`.length).replace(/^"|"$/g, "");
}

async function main() {
  const supabaseUrl = readEnvFileValue('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceRoleKey = readEnvFileValue('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key not found in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const adminPassword = 'Admin123!';
  const employerPassword = 'Employer123!';
  const jobseekerPassword = 'Jobseeker123!';

  console.log('Generating bcrypt hashes...');
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const employerHash = await bcrypt.hash(employerPassword, 10);
  const jobseekerHash = await bcrypt.hash(jobseekerPassword, 10);

  // 1. Bootstrap Admins
  console.log('\nBootstrapping admins...');
  const { data: admins, error: adminFetchErr } = await supabase.from('admins').select('id, email, password_hash');
  if (adminFetchErr) {
    console.error('Error fetching admins:', adminFetchErr);
  } else {
    for (const admin of admins) {
      if (!admin.password_hash || admin.password_hash.length < 30) {
        console.log(`Updating admin: ${admin.email}`);
        const { error } = await supabase.from('admins').update({
          password_hash: adminHash,
          updated_at: new Date().toISOString()
        }).eq('id', admin.id);
        if (error) console.error(`Error updating admin ${admin.email}:`, error);
      } else {
        console.log(`Admin ${admin.email} already has a password hash.`);
      }
    }
  }

  // 2. Bootstrap Employers
  console.log('\nBootstrapping employers...');
  const { data: employers, error: empFetchErr } = await supabase.from('employers').select('id, email, password_hash');
  if (empFetchErr) {
    console.error('Error fetching employers:', empFetchErr);
  } else {
    let updatedCount = 0;
    for (const emp of employers) {
      if (!emp.password_hash || emp.password_hash.length < 30) {
        const { error } = await supabase.from('employers').update({
          password_hash: employerHash,
          updated_at: new Date().toISOString()
        }).eq('id', emp.id);
        if (error) console.error(`Error updating employer ${emp.email}:`, error);
        else updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} employers.`);
  }

  // 3. Bootstrap Jobseekers
  console.log('\nBootstrapping jobseekers...');
  const { data: seekers, error: seekFetchErr } = await supabase.from('jobseekers').select('id, email, password_hash');
  if (seekFetchErr) {
    console.error('Error fetching jobseekers:', seekFetchErr);
  } else {
    let updatedCount = 0;
    for (const seek of seekers) {
      if (!seek.password_hash || seek.password_hash.length < 30) {
        const { error } = await supabase.from('jobseekers').update({
          password_hash: jobseekerHash,
          updated_at: new Date().toISOString()
        }).eq('id', seek.id);
        if (error) console.error(`Error updating jobseeker ${seek.email}:`, error);
        else updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} jobseekers.`);
  }

  // 4. Bootstrap Users
  console.log('\nBootstrapping users...');
  const { data: users, error: userFetchErr } = await supabase.from('users').select('id, email, password_hash');
  if (userFetchErr) {
    console.error('Error fetching users:', userFetchErr);
  } else {
    let updatedCount = 0;
    for (const u of users) {
      if (!u.password_hash || u.password_hash.length < 30) {
        const { error } = await supabase.from('users').update({
          password_hash: jobseekerHash
        }).eq('id', u.id);
        if (error) console.error(`Error updating user ${u.email}:`, error);
        else updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} users.`);
  }

  console.log('\nBootstrap complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
