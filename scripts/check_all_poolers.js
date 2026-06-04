const pg = require('pg');

const projectRef = 'tsvioxrlmcsqdricdgkd';
const password = encodeURIComponent('Jamley0119!');
const regions = [
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-northeast-3', // Osaka
  'ap-south-1',     // Mumbai
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-central-1',   // Frankfurt
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'ca-central-1',   // Canada Central
  'sa-east-1'       // Sao Paulo
];

async function checkPooler(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
  
  const client = new pg.Client({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Connected to pooler in region: ${region}`);
    const res = await client.query('SELECT 1 as ok');
    console.log('Query result:', res.rows);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed for region ${region}: ${err.message.trim()}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  console.log('Testing connection to Supabase poolers across different regions...');
  for (const region of regions) {
    const success = await checkPooler(region);
    if (success) {
      console.log(`\nFound it! The correct pooler is: aws-0-${region}.pooler.supabase.com`);
      process.exit(0);
    }
  }
  console.log('\nFinished checking all regions. None succeeded.');
}

main();
