// Helpers for building PostgREST filter strings (`.or(...)`) from user input.
// `.or()` takes raw filter grammar, so commas, parentheses, dots and quotes in an
// interpolated value can inject extra conditions. Validate ids as UUIDs and
// reduce free-text search terms to a safe character set before interpolating.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Free-text search term safe to place inside an `ilike` pattern in `.or()`:
 * keeps letters (any script), digits, spaces, '@', '-', '_' and apostrophes;
 * everything else (including , ( ) . : * % \ ") becomes a space. Trimmed and
 * capped at 100 characters. Returns "" when nothing usable remains.
 */
export function sanitizeSearchTerm(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[^\p{L}\p{N} @_'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
