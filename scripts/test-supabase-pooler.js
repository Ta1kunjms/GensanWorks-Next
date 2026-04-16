#!/usr/bin/env node

/**
 * Test Supabase Connection Pooler Connectivity
 * 
 * This script answers Supabase AI's three diagnostic questions:
 * 1. Are you using Prisma or Drizzle ORM?
 * 2. What's your DATABASE_URL (port and mode)?
 * 3. Does connection work on session mode (5432) vs transaction mode (6543)?
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Supabase Connection Pooler Diagnostic\n');

// Question 1: ORM Detection
console.log('═'.repeat(60));
console.log('QUESTION 1: Which ORM are you using?');
console.log('═'.repeat(60));

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const hasPrisma = !!packageJson.dependencies?.prisma || !!packageJson.devDependencies?.prisma;
const hasDrizzle = !!packageJson.dependencies?.drizzle || !!packageJson.devDependencies?.['drizzle-orm'] || !!packageJson.dependencies?.['drizzle-orm'];

console.log(`✅ Using ORM: ${hasDrizzle ? 'DRIZZLE ORM' : hasPrisma ? 'PRISMA' : 'UNKNOWN'}`);
if (hasPrisma) console.log('   → Using Prisma with supabase db:push? Check prisma/schema.prisma');
if (hasDrizzle) console.log('   → Using Drizzle ORM (drizzle-kit db:push)');
console.log('');

// Question 2: DATABASE_URL Format
console.log('═'.repeat(60));
console.log('QUESTION 2: What is your DATABASE_URL?');
console.log('═'.repeat(60));

const envLocalPath = path.join(process.cwd(), '.env.local');
let databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl && fs.existsSync(envLocalPath)) {
  const envLocal = fs.readFileSync(envLocalPath, 'utf8');
  const match = envLocal.match(/DATABASE_URL=(.+)/);
  if (match) {
    databaseUrl = match[1].trim().replace(/^["']|["']$/g, '');
  }
}

if (!databaseUrl) {
  console.log('❌ DATABASE_URL not found in .env.local');
  console.log('   → Action: Check that .env.local exists and contains DATABASE_URL');
  process.exit(1);
}

// Parse URL
const urlObj = new URL(databaseUrl);
const host = urlObj.hostname;
const port = urlObj.port;
const database = urlObj.pathname?.slice(1) || 'postgres';
const user = urlObj.username;

// Mask password for display
const passwordLength = urlObj.password?.length || 0;
const displayUrl = `postgresql://${user}:${'*'.repeat(Math.max(1, passwordLength))}@${host}:${port}/${database}`;

console.log(`Current DATABASE_URL:`);
console.log(`  Host: ${host}`);
console.log(`  Port: ${port}`);
console.log(`  Database: ${database}`);
console.log(`  User: ${user}`);
console.log(`  Full: ${displayUrl}`);
console.log('');

// Determine mode
const isTransactionMode = port === '6543' || port === 6543;
const isSessionMode = port === '5432' || port === 5432;

console.log(`Mode Detection:`);
if (isTransactionMode) {
  console.log('  🔴 TRANSACTION MODE (port 6543)');
  console.log('     → Good for short-lived connections (serverless)');
} else if (isSessionMode) {
  console.log('  🟢 SESSION MODE (port 5432)');
  console.log('     → Good for persistent connections (servers)');
} else {
  console.log(`  ⚠️  UNKNOWN MODE (port ${port})`);
}
console.log('');

// Question 3: Test Both Pooler Modes
console.log('═'.repeat(60));
console.log('QUESTION 3: Test pooler connectivity on BOTH modes');
console.log('═'.repeat(60));

const net = require('net');

const testPoolerConnectivity = async () => {
  const testPort = (hostName, portNum, modeName) => {
    return new Promise((resolve) => {
      console.log(`\n  Testing ${modeName} (${hostName}:${portNum})...`);
      
      const socket = new net.Socket();
      const timeout = 5000;
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        console.log(`    ✅ TCP connection successful!`);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        console.log(`    ❌ Connection timeout after ${timeout}ms`);
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', (err) => {
        console.log(`    ❌ Connection error: ${err.code || err.message}`);
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(portNum, hostName);
    });
  };

  // Extract connection details
  const transactionHost = host;
  const transactionPort = 6543;
  const sessionHost = host; // Same host, different port
  const sessionPort = 5432;
  
  // Note: This is a TCP-level test, not full DB auth
  console.log('\n  ⚠️  Note: This is a TCP connectivity test (not database auth)');
  console.log('     If TCP passes but DB queries fail, it\'s auth/query-level issue');
  
  const transactionResult = await testPort(transactionHost, transactionPort, 'Transaction Mode (6543)');
  const sessionResult = await testPort(sessionHost, sessionPort, 'Session Mode (5432)');
  
  console.log('\n');
  return { transactionResult, sessionResult };
};

// Run connectivity test
(async () => {
  try {
    await testPoolerConnectivity();
  } catch (err) {
    console.log(`Error during connectivity test: ${err.message}`);
  }
  
  // Final recommendations
  console.log('═'.repeat(60));
  console.log('RECOMMENDATIONS FOR SUPABASE SUPPORT');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Reply to Supabase AI with:');
  console.log('');
  console.log('1. ORM: ' + (hasDrizzle ? 'DRIZZLE ORM (not Prisma)' : hasPrisma ? 'PRISMA' : 'UNKNOWN'));
  console.log(`2. CONNECTION STRING: ${displayUrl}`);
  console.log(`3. PORT: ${port} (${isTransactionMode ? 'Transaction' : isSessionMode ? 'Session' : 'Unknown'} Mode)`);
  console.log('');
  console.log('Next Steps:');
  console.log('□ If both TCP tests failed: Network/firewall issue blocking pooler');
  console.log('□ If Transaction (6543) failed but Session (5432) passed: Try session mode');
  console.log('□ If both tests passed: Issue is database-level, not pooler reachability');
  console.log('');
})();
