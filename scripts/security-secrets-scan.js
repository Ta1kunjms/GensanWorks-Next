#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const ignoreDirs = new Set([".git", "node_modules", ".next", "test-results", "playwright-report", "exports"]);
const allowExtensions = new Set([".ts", ".tsx", ".js", ".json", ".md", ".yml", ".yaml", ".env", ".example"]);

const patterns = [
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "Private Key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Generic API key assignment", re: /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi },
];

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return false;
  return allowExtensions.has(ext);
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(full, out);
      }
      continue;
    }
    if (shouldScanFile(full)) {
      out.push(full);
    }
  }
}

function main() {
  const files = [];
  walk(root, files);

  const findings = [];

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (rel === ".env.local") continue;

    const content = fs.readFileSync(file, "utf8");
    for (const p of patterns) {
      const match = content.match(p.re);
      if (match && match.length > 0) {
        findings.push(`${rel}: ${p.name}`);
      }
    }
  }

  if (findings.length > 0) {
    console.error("Potential secret leaks detected:");
    for (const f of findings) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  }

  console.log("Secret scan passed.");
}

main();
