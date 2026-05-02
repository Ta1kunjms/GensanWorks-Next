require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL.replace(':6543', ':5432'), {ssl: 'require'});
sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'applications'`.then(res => {
  console.log(res.map(r => r.column_name));
  process.exit(0);
});
