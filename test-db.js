const { Client } = require('pg');

const connectionString = 'postgresql://postgres.tsvioxrlmcsqdricdgkd:Tycnjmsflrs21%2F@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString });

console.log('Attempting to connect to database...');
console.log('Connection string:', connectionString.replace(/:[^@]*@/, ':***@'));

client.connect((err) => {
  if (err) {
    console.error('Connection FAILED:', err.message);
    process.exit(1);
  } else {
    console.log('Connection SUCCESSFUL');
    
    client.query(SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';, (err, res) => {
      if (err) {
        console.error('Query FAILED:', err.message);
      } else {
        console.log('Tables found:', res.rows.length);
        res.rows.forEach(row => console.log('  -', row.table_name));
      }
      client.end();
    });
  }
});

setTimeout(() => {
  console.error('Timeout: Connection took too long');
  process.exit(1);
}, 10000);
