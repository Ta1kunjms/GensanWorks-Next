const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function runSql() {
  const migrationPath = process.argv[2];
  if (!migrationPath) {
    console.error('Usage: node run-sql.js <path-to-sql-file>');
    process.exit(1);
  }

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
  const sql = postgres(connUrl, { ssl: 'require' });

  const migration = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Running SQL from ${migrationPath}...`);
  try {
    await sql.unsafe(migration);
    console.log('SQL executed successfully!');
  } catch (err) {
    console.error('SQL execution failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSql();
