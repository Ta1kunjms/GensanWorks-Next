#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const placeholderPatterns = [/^your[-_]/i, /^example[-_]/i, /^replace[-_]/i, /^changeme$/i, /<.*>/];
const reportPath =
  process.env.DELIVERY_CHANNEL_REPORT_PATH ||
  path.join(process.cwd(), "reports", "validation", "delivery-channels-report.json");
const strictWarnings = process.env.DELIVERY_CHANNEL_STRICT === "1";

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
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

function normalizeValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function validateRequiredKey(checks, key, message, validator) {
  const raw = normalizeValue(process.env[key]);
  if (!raw) {
    checks.push({ name: key, status: "fail", message: `${key} is required ${message}` });
    return;
  }

  if (isPlaceholder(raw)) {
    checks.push({
      name: key,
      status: "fail",
      message: `${key} appears to contain a placeholder value`,
    });
    return;
  }

  if (validator && !validator(raw)) {
    checks.push({ name: key, status: "fail", message: `${key} has invalid format` });
    return;
  }

  checks.push({ name: key, status: "pass", message: `${key} is configured` });
}

function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const notificationEmailEnabled = process.env.NOTIFICATION_EMAIL_ENABLED !== "0";
  const notificationSmsEnabled = process.env.NOTIFICATION_SMS_ENABLED === "1";
  const checks = [];

  if (notificationEmailEnabled) {
    validateRequiredKey(checks, "RESEND_API_KEY", "when notification email is enabled");
    validateRequiredKey(
      checks,
      "RESEND_FROM_EMAIL",
      "when notification email is enabled",
      (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
    );
  } else {
    checks.push({
      name: "NOTIFICATION_EMAIL_ENABLED",
      status: "warning",
      message: "Email delivery is disabled (NOTIFICATION_EMAIL_ENABLED=0)",
    });
  }

  if (notificationSmsEnabled) {
    validateRequiredKey(
      checks,
      "TWILIO_ACCOUNT_SID",
      "when notification SMS is enabled",
      (value) => /^AC[a-zA-Z0-9]{32}$/.test(value)
    );
    validateRequiredKey(checks, "TWILIO_AUTH_TOKEN", "when notification SMS is enabled");
    validateRequiredKey(
      checks,
      "TWILIO_PHONE_NUMBER",
      "when notification SMS is enabled",
      (value) => /^\+[1-9]\d{6,14}$/.test(value)
    );
  } else {
    checks.push({
      name: "NOTIFICATION_SMS_ENABLED",
      status: "warning",
      message: "SMS delivery is disabled (NOTIFICATION_SMS_ENABLED is not 1)",
    });
  }

  if (!notificationEmailEnabled && !notificationSmsEnabled) {
    checks.push({
      name: "delivery-channel-state",
      status: "warning",
      message: "Both email and SMS notification channels are disabled",
    });
  }

  const summary = checks.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { pass: 0, warning: 0, fail: 0 }
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    strictWarnings,
    flags: {
      notificationEmailEnabled,
      notificationSmsEnabled,
    },
    summary,
    checks,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const shouldFail = summary.fail > 0 || (strictWarnings && summary.warning > 0);
  if (shouldFail) {
    console.error("Delivery channel verification failed.");
    for (const check of checks.filter((item) => item.status !== "pass")) {
      console.error(`- [${check.status}] ${check.message}`);
    }
    console.error(`Report written to ${reportPath}`);
    process.exit(1);
  }

  if (summary.warning > 0) {
    console.warn("Delivery channel verification completed with warnings.");
    for (const check of checks.filter((item) => item.status === "warning")) {
      console.warn(`- ${check.message}`);
    }
  } else {
    console.log("Delivery channel verification passed.");
  }

  console.log(`Report written to ${reportPath}`);
}

main();
