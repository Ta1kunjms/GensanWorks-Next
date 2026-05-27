import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const EMAIL = 'tycoonjamesaflores@gmail.com';

async function run() {
  // Check Supabase auth user ID
  const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = users?.find(u => u.email === EMAIL);
  console.log('\n=== Supabase AUTH user ===');
  console.log('auth UUID:', authUser?.id);
  console.log('email:', authUser?.email);
  console.log('metadata:', JSON.stringify(authUser?.user_metadata));

  // Check jobseekers table ID
  const { data: js } = await supabaseAdmin.from('jobseekers').select('id, email').eq('email', EMAIL);
  console.log('\n=== jobseekers table ===');
  console.log('jobseeker ID:', js?.[0]?.id);

  // Check users table ID
  const { data: usr } = await supabaseAdmin.from('users').select('id, email').eq('email', EMAIL);
  console.log('\n=== users table ===');
  console.log('user ID:', usr?.[0]?.id);

  // Cross-check: does any application row exist for the AUTH uuid?
  if (authUser?.id) {
    const { data: appsAuth } = await supabaseAdmin.from('applications').select('id').eq('jobseeker_id', authUser.id);
    console.log('\n=== Applications where jobseeker_id = auth UUID ===');
    console.log('Count:', appsAuth?.length ?? 0);

    const { data: appsJs } = await supabaseAdmin.from('applications').select('id').eq('jobseeker_id', js?.[0]?.id);
    console.log('\n=== Applications where jobseeker_id = jobseekers.id ===');
    console.log('Count:', appsJs?.length ?? 0);
  }
}

run().catch(console.error);
