const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const getVal = (k) => {
  const line = lines.find(l => l.startsWith(k + '='));
  return line ? line.slice(k.length + 1).trim() : null;
};

const supabase = createClient(getVal('NEXT_PUBLIC_SUPABASE_URL'), getVal('SUPABASE_SERVICE_ROLE_KEY'));

async function checkColumns() {
  // Get all columns for each table via a wildcard select on a single row
  for (const table of ['admins', 'employers', 'users', 'jobs']) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`\n[${table}] ERROR: ${error.message}`);
    } else if (!data || data.length === 0) {
      // Try to get column names from an empty result using count
      const { data: d2, error: e2 } = await supabase.from(table).select('*').limit(0);
      console.log(`\n[${table}] EMPTY TABLE - error: ${e2?.message ?? 'none'}`);
      // Try inserting nothing to get schema info
    } else {
      console.log(`\n[${table}] COLUMNS: ${Object.keys(data[0]).join(', ')}`);
      console.log(`[${table}] SAMPLE ROW:`, JSON.stringify(data[0], null, 2));
    }
  }
}

checkColumns().catch(console.error);
