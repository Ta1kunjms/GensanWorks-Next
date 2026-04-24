#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function sanitizeTableName(tableName) {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid table name '${tableName}' for backup drill.`);
  }
  return tableName;
}

function buildDatabaseMetadata(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: parsed.pathname.replace(/^\//, ""),
  };
}

async function main() {
  const envFileValues = parseEnvFile(path.join(process.cwd(), ".env.local"));
  const databaseUrl = process.env.DATABASE_URL || envFileValues.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (env or .env.local) to run backup drill.");
  }

  const defaultTables = [
    "admins",
    "users",
    "employers",
    "jobs",
    "applications",
    "messages",
    "notifications",
  ];

  const requestedTables = (process.env.BACKUP_DRILL_TABLES || defaultTables.join(","))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(sanitizeTableName);

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 30,
    ssl: "require",
    prepare: false,
  });

  const tableSnapshots = [];
  const skippedTables = [];

  try {
    for (const tableName of requestedTables) {
      const [existsRow] = await sql`select to_regclass(${`public.${tableName}`}) is not null as exists`;
      if (!existsRow?.exists) {
        skippedTables.push({ table: tableName, reason: "table not found" });
        continue;
      }

      const escapedTableName = tableName.replace(/"/g, '""');
      const rows = await sql.unsafe(`select count(*)::bigint as count from "${escapedTableName}"`);
      tableSnapshots.push({
        table: tableName,
        rowCount: Number(rows?.[0]?.count || 0),
      });
    }

    if (tableSnapshots.length === 0) {
      throw new Error("Backup drill did not find any tables to snapshot.");
    }

    const backupSnapshot = {
      generatedAt: new Date().toISOString(),
      metadata: buildDatabaseMetadata(databaseUrl),
      tables: tableSnapshots,
      skippedTables,
    };

    const outputDir = path.join(process.cwd(), "exports", "backup-drills");
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = backupSnapshot.generatedAt.replace(/[:.]/g, "-");
    const timestampedPath = path.join(outputDir, `backup-drill-${timestamp}.json`);
    const latestPath = path.join(outputDir, "backup-drill-latest.json");

    fs.writeFileSync(timestampedPath, `${JSON.stringify(backupSnapshot, null, 2)}\n`, "utf8");
    fs.writeFileSync(latestPath, `${JSON.stringify(backupSnapshot, null, 2)}\n`, "utf8");

    const reloadedSnapshot = JSON.parse(fs.readFileSync(latestPath, "utf8"));
    if (!Array.isArray(reloadedSnapshot.tables) || reloadedSnapshot.tables.length !== tableSnapshots.length) {
      throw new Error("Backup drill snapshot reload validation failed.");
    }

    await sql.begin(async (transaction) => {
      await transaction`create temporary table backup_drill_payload (payload jsonb not null)`;
      await transaction`insert into backup_drill_payload (payload) values (${reloadedSnapshot})`;

      const [countRow] = await transaction`select count(*)::int as count from backup_drill_payload`;
      const [typeRow] = await transaction`select jsonb_typeof(payload) as payload_type from backup_drill_payload limit 1`;

      if (countRow?.count !== 1 || typeRow?.payload_type !== "object") {
        throw new Error("Backup drill restore simulation validation failed.");
      }
    });

    console.log("Backup/restore drill completed successfully.");
    console.log(`- Snapshot file: ${timestampedPath}`);
    console.log(`- Latest snapshot: ${latestPath}`);
    console.log(`- Tables captured: ${tableSnapshots.length}`);
    console.log(`- Tables skipped: ${skippedTables.length}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Backup/restore drill failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
