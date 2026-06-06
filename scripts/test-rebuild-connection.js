const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function testAndMigrate() {
  let env;
  try {
    env = fs.readFileSync('.env.local', 'utf8');
  } catch (e) {
    console.error('Could not find .env.local');
    process.exit(1);
  }

  const lines = env.split(/\r?\n/);
  const getVal = (k) => {
    const line = lines.find(l => l.startsWith(k + '='));
    if (!line) return null;
    let val = line.slice(k.length + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    return val;
  };

  const databaseUrl = getVal('DATABASE_URL');
  if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  // Use port 5432 for direct connection if 6543 is pooler
  const connUrl = databaseUrl.replace(':6543', ':5432');
  console.log('Connecting to database using direct URL:', connUrl.replace(/:[^:@/]+@/, ':****@'));
  
  const sql = postgres(connUrl, { ssl: 'require' });

  try {
    const res = await sql`SELECT 1 as ok`;
    console.log('Successfully connected to Postgres! Result:', res);

    const migrationPath = path.join(process.cwd(), 'scripts', 'migrations', '20260424_add_audit_logs.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running audit_logs table creation SQL...');
    await sql.unsafe(migrationSql);
    console.log('Migration executed successfully! audit_logs table exists.');
  } catch (err) {
    console.error('Connection/execution failed:', err);
  } finally {
    await sql.end();
  }
}

testAndMigrate();
