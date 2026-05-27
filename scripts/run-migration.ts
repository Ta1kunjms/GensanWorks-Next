/**
 * run-migration.ts
 * 
 * Utility script to execute Supabase SQL migrations directly from Node.js
 * using the postgres driver.
 * 
 * Run with: npx tsx scripts/run-migration.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

let resolvedDbUrl = dbUrl;
console.log("ℹ️ Connecting to Supabase pooler on port 6543...");


async function runMigration() {
  console.log("=== Supabase Migration Runner ===");
  const migrationFile = path.join(__dirname, "../supabase/migrations/20260527010000_skill_synonym_and_embedding_cache.sql");

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFile, "utf-8");
  console.log(`Loading migration script: ${path.basename(migrationFile)}...`);

  // Initialize connection
  const sql = postgres(resolvedDbUrl, {
    ssl: "require",
    prepare: false,
    connect_timeout: 30
  });

  try {
    console.log("Connecting to Supabase Database...");
    
    // We execute the statements as a single multi-statement block
    await sql.unsafe(sqlContent);
    
    console.log("\n🎉 MIGRATION SUCCESSFUL!");
    console.log("The following tables are now available:");
    console.log("  - skill_synonyms");
    console.log("  - skill_embeddings_cache");
  } catch (err: any) {
    console.error("\n❌ MIGRATION FAILED:");
    console.error(err.message || err);
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);
