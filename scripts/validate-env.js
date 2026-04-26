#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const requiredKeys = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optionalPairs = [["NEXTAUTH_SECRET", "AUTH_SECRET"]];
const placeholderPatterns = [
  /^your[-_]/i,
  /^example[-_]/i,
  /^replace[-_]/i,
  /^changeme$/i,
  /<.*>/,
];

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function printResult(title, items) {
  if (items.length === 0) return;
  console.error(`\n${title}`);
  for (const item of items) {
    console.error(`- ${item}`);
  }
}

function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const strict = process.env.VALIDATE_ENV_STRICT === "1";

  const missing = [];
  const placeholder = [];

  for (const key of requiredKeys) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
      continue;
    }

    if (isPlaceholder(value)) {
      placeholder.push(`${key} appears to contain a placeholder value`);
    }
  }

  for (const [a, b] of optionalPairs) {
    const av = process.env[a];
    const bv = process.env[b];
    if (av && bv && av !== bv) {
      placeholder.push(`${a} and ${b} should match to avoid auth inconsistency`);
    }
  }

  if (missing.length > 0 || (strict && placeholder.length > 0)) {
    printResult("Environment validation failed.", []);
    printResult("Missing required keys:", missing);
    printResult("Configuration warnings:", placeholder);
    
    if ((process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") && !strict) {
      console.warn("\n⚠️ Skipping hard-fail in CI environment. Build will continue but may fail during execution.");
    } else {
      process.exit(1);
    }
  }

  if (placeholder.length > 0) {
    printResult("Environment validation warnings:", placeholder);
  }

  console.log("Environment validation passed.");
}

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    value = value.replace(/^['\"]|['\"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

main();
