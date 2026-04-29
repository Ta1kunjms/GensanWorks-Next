import { supabaseAdmin } from './app/lib/supabase';

async function checkJobsCols() {
  const { data, error } = await supabaseAdmin.rpc('get_table_columns', { table_name: 'jobs' });
  if (error) {
    // Fallback if rpc is not available: select 1 row and check keys
    const { data: row, error: rowError } = await supabaseAdmin.from('jobs').select('*').limit(1);
    if (rowError) {
      console.error('Error fetching jobs:', rowError);
      return;
    }
    if (row && row.length > 0) {
      console.log('Jobs columns (via select *):', Object.keys(row[0]));
    } else {
      console.log('Jobs table is empty, trying to get schema via different rpc or direct query...');
      // Try a query that will fail but show columns in error or something? No.
      // Let's try to insert an empty object and see the error? No.
      // Let's use the query we know works for information_schema if we had postgres access.
      // Since we don't have direct PG access, let's try to fetch an empty set but with a select that might show something.
    }
  } else {
    console.log('Jobs columns (via rpc):', data);
  }
}

checkJobsCols();
