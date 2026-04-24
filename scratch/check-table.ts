import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { error } = await supabase.from("jobseeker_settings").select("*").limit(1);
  if (error) {
    console.log("Table jobseeker_settings does not exist or error:", error.message);
  } else {
    console.log("Table jobseeker_settings exists!");
  }
}

checkTable();
