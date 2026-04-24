const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
const url = match ? match[1].replace(/^"|"$/g, '') : null;

async function test() {
  const sql = postgres(url, { max: 1, ssl: 'require', connect_timeout: 10 });
  const result = await sql`SELECT password_hash FROM admins WHERE lower(email) = 'admin@gensanworks.com'`;
  const hash = result[0].password_hash;
  
  console.log('Stored hash:', hash);
  console.log('Hash length:', hash.length);
  console.log('Hash version:', hash.substring(0, 4));
  
  const cost = parseInt(hash.substring(4, 6));
  console.log('Cost factor:', cost);
  
  const parts = hash.split('$');
  console.log('Hash parts count:', parts.length);
  console.log('Hash parts:', parts);
  
  const testPasswords = ['Admin123!', 'password123', 'admin', 'Admin123', 'Admin@123456', 'admin123!'];
  
  for (const pwd of testPasswords) {
    const matches = await bcrypt.compare(pwd, hash);
    console.log('Password "' + pwd + '" matches:', matches);
  }
  
  await sql.end({ timeout: 5 });
}

test().catch(e => console.error('Error:', e.message));
