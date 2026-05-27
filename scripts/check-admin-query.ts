import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabaseAdmin.from("referral_slips").select(`
    id, slip_number, status, issued_at, valid_until, applicant_id,
    jobs ( position_title, employers ( establishment_name ) )
  `).order("issued_at", { ascending: false }).limit(2);
  
  if (error) {
    console.error("Query failed:", error);
  } else {
    console.log("Query succeeded:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
