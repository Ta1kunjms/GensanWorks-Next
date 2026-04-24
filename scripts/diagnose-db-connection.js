#!/usr/bin/env node
/**
 * Database Connectivity Troubleshooting Script
 * 
 * This script diagnoses why database connections are failing.
 * Run: node scripts/diagnose-db-connection.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function check(condition, successMsg, failureMsg) {
  if (condition) {
    log(`✅ ${successMsg}`, 'green');
    return true;
  } else {
    log(`❌ ${failureMsg}`, 'red');
    return false;
  }
}

function unwrapQuotedValue(value) {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  const isDoubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"');
  const isSingleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'");

  if ((isDoubleQuoted || isSingleQuoted) && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizeDatabaseUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.hostname.endsWith('.pooler.supabase.com') && parsed.port === '5432') {
      parsed.port = '6543';
      return {
        value: parsed.toString(),
        wasNormalized: true,
      };
    }

    return {
      value: urlString,
      wasNormalized: false,
    };
  } catch {
    return {
      value: urlString,
      wasNormalized: false,
    };
  }
}

function withPort(urlString, port) {
  try {
    const parsed = new URL(urlString);
    parsed.port = String(port);
    return parsed.toString();
  } catch {
    return urlString;
  }
}

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  log('\n🔍 Database Connectivity Diagnostic Tool', 'cyan');
  log('=========================================\n', 'cyan');

  let allChecks = true;

  // Check 1: .env.local exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  allChecks &= check(
    fs.existsSync(envLocalPath),
    '.env.local file found',
    '.env.local file not found (required for DATABASE_URL)'
  );

  // Check 2: DATABASE_URL is set
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const databaseUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  const databaseUrl = databaseUrlMatch
    ? unwrapQuotedValue(databaseUrlMatch[1])
    : null;

  allChecks &= check(
    databaseUrl,
    `DATABASE_URL is configured: ${databaseUrl ? '✓' : '✗'}`,
    'DATABASE_URL is not set in .env.local'
  );

  if (!databaseUrl) {
    log('\n❌ Cannot proceed without DATABASE_URL', 'red');
    return;
  }

  const normalizedResult = normalizeDatabaseUrl(databaseUrl);
  const normalizedDatabaseUrl = normalizedResult.value;

  if (normalizedResult.wasNormalized) {
    log('ℹ️  Added alternate pooler probe at port 6543', 'yellow');
  }

  // Check 3: Parse connection string
  let host, port, user, password;
  try {
    const connMatch = normalizedDatabaseUrl.match(
      /postgresql:\/\/([^:]+):(.+)@([^:]+):(\d+)/
    );
    if (connMatch) {
      [, user, password, host, port] = connMatch;
      log(
        `✅ Connection string parsed:\n   Host: ${host}\n   Port: ${port}\n   User: ${user}`,
        'green'
      );
    } else {
      log('❌ Failed to parse DATABASE_URL connection string', 'red');
      allChecks = false;
    }
  } catch (err) {
    log(`❌ Error parsing connection string: ${err.message}`, 'red');
    allChecks = false;
  }

  // Check 4: Test network connectivity (if host is available)
  if (host && port) {
    log('\n🌐 Testing network connectivity...', 'blue');
    try {
      // Use DNS lookup to verify host is resolvable
      const dns = require('dns').promises;
      await dns.resolve4(host);
      log(`✅ Host ${host} is resolvable via DNS`, 'green');

      // Try to establish a TCP connection
      const net = require('net');
      const socket = new Promise((resolve) => {
        const s = net.createConnection(
          { host, port: parseInt(port), timeout: 5000 },
          () => {
            s.destroy();
            resolve(true);
          }
        );
        s.on('error', () => resolve(false));
        s.on('timeout', () => {
          s.destroy();
          resolve(false);
        });
      });

      const connected = await socket;
      allChecks &= check(
        connected,
        `Successfully connected to ${host}:${port}`,
        `Failed to connect to ${host}:${port} (CONNECT_TIMEOUT or refused)\n   ⚠️  This indicates:\n   - Supabase database may not be running\n   - Network/firewall may be blocking port ${port}\n   - Database server may be down`
      );
    } catch (err) {
      log(`❌ Network test failed: ${err.message}`, 'red');
      allChecks = false;
    }
  }

  // Check 5: Run an actual SQL health check using pg client
  log('\n🗄️  Testing database query execution...', 'blue');
  try {
    const configPath = path.join(process.cwd(), 'drizzle.config.ts');
    if (fs.existsSync(configPath)) {
      log('✅ drizzle.config.ts found', 'green');
      const candidateUrls = [];
      const seen = new Set();

      const pushCandidate = (label, value) => {
        if (!value || seen.has(value)) {
          return;
        }
        seen.add(value);
        candidateUrls.push({ label, value });
      };

      pushCandidate('Configured URL', databaseUrl);
      pushCandidate('Pooler alt (6543)', normalizedDatabaseUrl);
      pushCandidate('Pooler alt (5432)', withPort(databaseUrl, 5432));

      log(
        `\nAttempting SQL query on ${candidateUrls.length} connection candidate(s) (timeout: 30s each, up to 2 retries each)...`,
        'yellow'
      );

      const postgres = require('postgres');

      let result = false;
      let lastError = null;

      for (const candidate of candidateUrls) {
        if (result) {
          break;
        }

        log(`\n   Candidate: ${candidate.label}`, 'cyan');

        for (let attempt = 1; attempt <= 2; attempt += 1) {
          let sql;
          try {
            log(`   Attempt ${attempt}/2`, 'cyan');
            sql = postgres(candidate.value, {
              max: 1,
              idle_timeout: 30,
              connect_timeout: 30,
              ssl: 'require',
              prepare: false,
            });

            const queryResult = await Promise.race([
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database connection timeout')), 30000)
              ),
              sql`select 1 as ok`,
            ]);

            await sql.end({ timeout: 5 });
            result = queryResult?.[0]?.ok === 1;
            lastError = null;
            if (result) {
              log(`   ✅ SQL query succeeded with: ${candidate.label}`, 'green');
              break;
            }
          } catch (error) {
            lastError = error;
            if (sql) {
              try {
                await sql.end({ timeout: 5 });
              } catch {
                // Ignore cleanup errors in diagnostic mode.
              }
            }

            if (attempt < 2) {
              await wait(1200);
            }
          }
        }
      }

      allChecks &= check(
        result === true,
        'Database connection and SQL query successful (SELECT 1)',
        lastError?.message
          ? `Connected to host but failed SQL query: ${lastError.message}`
          : 'Connected to database but failed to execute SQL query'
      );
    } else {
      log('❌ drizzle.config.ts not found', 'red');
      allChecks = false;
    }
  } catch (err) {
    if (err.message.includes('timeout')) {
      log(
        '❌ Database connection timeout\n   This usually means the database is paused, overloaded, or the pooler mode/port is mismatched.\n   Possible causes:\n   - Supabase database is paused/stopped\n   - Pooler URL is using the wrong port\n   - Network is blocked\n   - Database server is down',
        'red'
      );
    } else {
      log(`❌ Database connection error: ${err.message}`, 'red');
    }
    allChecks = false;
  }

  // Final recommendations
  log('\n' + '='.repeat(50), 'cyan');
  if (allChecks) {
    log('✅ All checks passed! Database is accessible.', 'green');
    log('You can now run: npm run dev', 'green');
  } else {
    log('❌ Some checks failed. Recommendations:', 'yellow');
    log('\n1. Verify Supabase database is running:', 'yellow');
    log('   Go to https://app.supabase.com → Select project → Check database status', 'cyan');
    log('\n2. If status is "Paused", click "Resume" to start the database', 'cyan');
    log('\n3. After resuming, run this script again to verify connectivity', 'cyan');
    log('\n4. If network is blocked:', 'yellow');
    log('   - Check corporate firewall settings', 'cyan');
    log('   - Check VPN connection', 'cyan');
    log('   - Check ISP restrictions', 'cyan');
    log('\n5. If still failing, verify DATABASE_URL in .env.local:', 'yellow');
    log('   Copy exact connection string from Supabase Settings → Database → Connection pooling', 'cyan');
    log('\n6. Supabase pooler tip:', 'yellow');
    log('   - If host ends with .pooler.supabase.com and port is 5432, use 6543 for transaction pooling', 'cyan');
  }
  log('', 'reset');
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
