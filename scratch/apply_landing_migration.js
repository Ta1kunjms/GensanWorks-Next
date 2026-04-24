const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const getVal = (k) => {
  const line = lines.find(l => l.startsWith(k + '='));
  if (!line) return null;
  let val = line.slice(k.length + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val;
};

const databaseUrl = getVal('DATABASE_URL'); // Use original URL

async function runMigration() {
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: 'require',
    connect_timeout: 30, // 30 seconds
  });

  console.log('Applying landing page migration...');

  try {
    const migrationPath = path.join(__dirname, '../scripts/migrations/20260424_landing_page_tables.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    await sql.unsafe(migrationSql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await sql.end();
  }
}

runMigration();
