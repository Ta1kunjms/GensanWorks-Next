const { Client } = require("pg");

const password = "Jamley0119!";
const tenant = "tsvioxrlmcsqdricdgkd";
const regions = [
  "ap-southeast-1", // Singapore
  "ap-southeast-2", // Sydney
  "ap-northeast-2", // Seoul
  "ap-northeast-1", // Tokyo
  "us-east-1",
  "us-west-1",
  "eu-west-1"
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`\n--- Testing region: ${region} (${host}) ---`);
  
  const client = new Client({
    host,
    port: 6543,
    user: `postgres.${tenant}`,
    password,
    database: "postgres",
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`SUCCESS for region ${region}!`);
    const res = await client.query("SELECT 1 as ok");
    console.log("Query result:", res.rows);
    return true;
  } catch (err) {
    console.log(`FAILED:`, err.message);
    return false;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

async function main() {
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log(`\nFound working region: ${region}`);
      break;
    }
  }
}

main();
