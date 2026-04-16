/**
 * Database Connection Wrapper with Fallback to Mock
 * 
 * When DATABASE_URL is unreachable (connection timeout),
 * automatically falls back to in-memory mock database.
 * This allows Phase 3-9 testing to proceed during database recovery.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { mockDb } from './db-mock';

let db: ReturnType<typeof drizzle> | typeof mockDb | null = null;
let isMocked = false;

async function initializeDatabase() {
  if (db) return;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set, using mock database');
    isMocked = true;
    db = mockDb;
    return;
  }

  try {
    // Try to create a real connection with short timeout
    const client = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 5, // 5 second timeout
    });

    // Test connection
    await client`SELECT 1`;

    console.log('✅ Connected to real database');
    db = drizzle(client, { schema });
    isMocked = false;
  } catch (error: unknown) {
    if (
      (error instanceof Error && error.message?.includes('timeout')) ||
      (typeof error === 'object' && error !== null && 'code' in error && (error as Record<string, unknown>).code === 'CONNECT_TIMEOUT')
    ) {
      console.warn(
        '⚠️  Database connection timeout, falling back to mock database'
      );
      console.warn(
        '   To use real database, ensure Supabase is running: https://app.supabase.com'
      );
      isMocked = true;
      db = mockDb;
    } else {
      throw error;
    }
  }
}

export async function getDb() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}

export async function isDatabaseMocked() {
  if (!db) {
    await initializeDatabase();
  }
  return isMocked;
}

// Initialize on module load
initializeDatabase().catch((err) => {
  console.error('Fatal error initializing database:', err);
  process.exit(1);
});

export { db };
