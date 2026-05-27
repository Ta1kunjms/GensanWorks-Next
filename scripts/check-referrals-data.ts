import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cols, error: err1 } = await supabaseAdmin.from('applications').insert({
    job_id: 'c005b209-cdf7-477a-8176-825f902b2242',
    applicant_id: '26b698ad-0002-4a3b-bcef-b8f3265881b1',
    employer_id: '64bf9a2a-5c4c-43b4-8972-ba950cf5ec12',
    status: 'pending',
    source: 'referred'
  });
  console.log("Insert result (applicant_id):", { data: cols, error: err1 });

  const { data: cols2, error: err2 } = await supabaseAdmin.from('applications').insert({
    job_id: 'c005b209-cdf7-477a-8176-825f902b2242',
    jobseeker_id: '26b698ad-0002-4a3b-bcef-b8f3265881b1',
    employer_id: '64bf9a2a-5c4c-43b4-8972-ba950cf5ec12',
    status: 'pending',
    source: 'referred'
  });
  console.log("Insert result (jobseeker_id):", { data: cols2, error: err2 });
}

run().catch(console.error);
