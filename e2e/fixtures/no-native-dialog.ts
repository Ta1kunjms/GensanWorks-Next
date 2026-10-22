// Playwright fixture that fails a test when the page opens a native dialog
// (alert, confirm, prompt, beforeunload). Use the shared ConfirmDialog and toasts instead.
// Usage: import { test, expect } from "./fixtures/no-native-dialog";

import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ nativeDialogs: string[] }>({
  nativeDialogs: [
    async ({ page }, use) => {
      const seen: string[] = [];
      page.on("dialog", (dialog) => {
        seen.push(`${dialog.type()}: ${dialog.message()}`);
        // Dismiss so the page does not hang; the test still fails below.
        dialog.dismiss().catch(() => undefined);
      });
      await use(seen);
      expect(seen, `native dialog(s) opened: ${seen.join(" | ")}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
