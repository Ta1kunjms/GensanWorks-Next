import { test } from "node:test";
import assert from "node:assert";
import { getNotificationActionUrl } from "@/lib/notifications";

test("getNotificationActionUrl maps jobseeker + referral_slip to deep-link URL", () => {
  const url = getNotificationActionUrl("jobseeker", "referral_slip");
  const expectedBase = process.env.NEXT_PUBLIC_APP_URL || "https://gensanworks.com";
  assert.strictEqual(url, `${expectedBase}/jobseeker/referrals`);
});

test("getNotificationActionUrl maps jobseeker + referral to deep-link URL", () => {
  const url = getNotificationActionUrl("jobseeker", "referral");
  const expectedBase = process.env.NEXT_PUBLIC_APP_URL || "https://gensanworks.com";
  assert.strictEqual(url, `${expectedBase}/jobseeker/referrals`);
});

test("getNotificationActionUrl maps employer + referral_slip to deep-link URL", () => {
  const url = getNotificationActionUrl("employer", "referral_slip");
  const expectedBase = process.env.NEXT_PUBLIC_APP_URL || "https://gensanworks.com";
  assert.strictEqual(url, `${expectedBase}/employer/applications?tab=referrals`);
});

test("getNotificationActionUrl maps employer + referral to deep-link URL", () => {
  const url = getNotificationActionUrl("employer", "referral");
  const expectedBase = process.env.NEXT_PUBLIC_APP_URL || "https://gensanworks.com";
  assert.strictEqual(url, `${expectedBase}/employer/applications?tab=referrals`);
});

test("getNotificationActionUrl falls back to root domain for messages and other roles", () => {
  const expectedBase = process.env.NEXT_PUBLIC_APP_URL || "https://gensanworks.com";
  
  const msgUrlJobseeker = getNotificationActionUrl("jobseeker", "message");
  assert.strictEqual(msgUrlJobseeker, expectedBase);

  const msgUrlEmployer = getNotificationActionUrl("employer", "message");
  assert.strictEqual(msgUrlEmployer, expectedBase);

  const adminUrlReferral = getNotificationActionUrl("admin", "referral_slip");
  assert.strictEqual(adminUrlReferral, expectedBase);
});
