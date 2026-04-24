const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

async function listTables() {
  const sql = postgres(dbUrl, { connect_timeout: 10 });
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in public schema:');
    tables.forEach(t => console.log(`- ${t.table_name}`));
  } catch (err) {
    console.error('Failed to list tables:', err.message);
  } finally {
    await sql.end();
  }
}

listTables();
