import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const applicantId = '26b698ad-0002-4a3b-bcef-b8f3265881b1';
  
  const result = await supabaseAdmin
    .from("applications")
    .select(
      `id, status, source, submitted_at, reviewed_at, interview_date, job_id,
       jobs(
         position_title,
         employers(establishment_name, city, province)
       )`
    )
    .eq("jobseeker_id", applicantId)
    .order("submitted_at", { ascending: false });
    
  console.log("Jobseeker API Query Result:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
