import { randomInt } from "node:crypto";

// Unambiguous uppercase alphabet (no 0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Referral slip number shown on the printed slip and encoded in its QR code,
 * e.g. RS-2026-7KQ3M9XWTD. 10 random characters (~5e14 combinations per year)
 * so slips cannot be enumerated through the public verification page.
 */
export function generateReferralSlipNumber(now: Date = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 10; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `RS-${now.getFullYear()}-${suffix}`;
}
