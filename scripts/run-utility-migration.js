const postgres = require('postgres');
const fs = require('fs');

async function runMigration() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const lines = env.split(/\r?\n/);
  const getVal = (k) => {
    const line = lines.find(l => l.startsWith(k + '='));
    if (!line) return null;
    let val = line.slice(k.length + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    return val;
  };

  const databaseUrl = getVal('DATABASE_URL').replace(':6543', ':5432');
  const sql = postgres(databaseUrl);

  const migration = fs.readFileSync('docs/migrations/utility_agent_setup.sql', 'utf8');

  console.log('Running migration...');
  try {
    await sql.unsafe(migration);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

runMigration();
