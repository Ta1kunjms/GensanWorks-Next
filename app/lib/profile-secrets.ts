// Fields that must never leave the server, even to the profile's owner or an admin.
const SECRET_FIELDS = ["password_hash"] as const;

/** Returns a copy of a profile row without secret fields (password hashes). */
export function omitSecrets<T extends Record<string, unknown>>(row: T): Omit<T, (typeof SECRET_FIELDS)[number]>;
export function omitSecrets<T extends Record<string, unknown>>(row: T | null | undefined): Omit<T, (typeof SECRET_FIELDS)[number]> | null;
export function omitSecrets<T extends Record<string, unknown>>(row: T | null | undefined) {
  if (!row) return null;
  const copy: Record<string, unknown> = { ...row };
  for (const field of SECRET_FIELDS) delete copy[field];
  return copy;
}

/** omitSecrets for every row of a list. */
export function omitSecretsAll<T extends Record<string, unknown>>(rows: T[] | null | undefined) {
  return (rows ?? []).map((row) => omitSecrets(row));
}
