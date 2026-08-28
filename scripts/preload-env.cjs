// Preloads .env.local into process.env before any module is evaluated.
// Used via: npx tsx --require ./scripts/preload-env.cjs <script>
const fs = require("fs");
const path = require("path");

const isTestRunner = process.env.NODE_ENV === "test" || Boolean(process.env.NODE_TEST_CONTEXT) || process.argv.some(arg => arg.includes("test"));
if (isTestRunner) {
  process.env.NODE_ENV = "test";
}

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (key === "NODE_ENV" && isTestRunner) continue;
    if (!process.env[key]) process.env[key] = value;
  }
}
