const { createClient } = require("@supabase/supabase-client");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from("jobseekers")
    .select("id, job_seeking_status");
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Total jobseekers:", data.length);
  const counts = data.reduce((acc, j) => {
    acc[j.job_seeking_status] = (acc[j.job_seeking_status] || 0) + 1;
    return acc;
  }, {});
  console.log("Status counts:", counts);
}

check();
