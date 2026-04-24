import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
} catch (err) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'jobs' });
  
  if (error) {
    // Fallback: try to select one row
    const { data: oneRow, error: rowError } = await supabase.from('jobs').select('*').limit(1);
    if (rowError) {
      console.error("Error fetching jobs table:", rowError.message);
    } else {
      console.log("Columns in 'jobs' table:", Object.keys(oneRow[0] || {}));
    }
  } else {
    console.log("Columns in 'jobs' table:", data);
  }
}

checkSchema();
