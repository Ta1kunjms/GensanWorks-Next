// Read-only screenshots for the UI cleanup (branch ui-cleanup, Step 1).
// Captures only; no pixel assertions. Output: ui-evidence/<label>/<name>-<viewport>.png
// (gitignored; Playwright empties test-results/ on every run, so it is not used here).
// Run: UI_SNAPSHOT_LABEL=before npx playwright test e2e/ui-baseline.spec.ts

import { test } from "./fixtures/no-native-dialog";

// Folder-safe label, e.g. "before" or "after".
const LABEL = (process.env.UI_SNAPSHOT_LABEL || "before").replace(/[^\w-]/g, "_");

const VIEWPORTS = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1440x900", width: 1440, height: 900 },
];

const PUBLIC_PAGES = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
];

// TODO: role pages (jobseeker, employer and admin dashboards, jobs, applications)
// need authenticated sessions; add them with the loginAsRole helper once
// E2E_* credentials are available in the capture environment.

test.describe("UI baseline screenshots (public pages)", () => {
  for (const viewport of VIEWPORTS) {
    for (const target of PUBLIC_PAGES) {
      test(`${target.name} @ ${viewport.label}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(target.path, { waitUntil: "networkidle" });
        await page.screenshot({
          path: `ui-evidence/${LABEL}/${target.name}-${viewport.label}.png`,
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  }
});
