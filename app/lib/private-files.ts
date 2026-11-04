// Kept free of the Supabase client import so the access rules are unit-testable.
// Bucket ids must match STORAGE_BUCKETS in ./supabase.ts.

/**
 * Buckets that hold personal documents. They are private in Supabase Storage;
 * files are only reachable through /api/files/<bucket>/<path>, which checks
 * access and redirects to a short-lived signed URL.
 *
 * Every object path starts with the uploader's user id: `<ownerId>/...`.
 */
export const PRIVATE_FILE_BUCKETS = {
  resumes: "jobseeker",
  "jobseeker-documents": "jobseeker",
  "employer-documents": "employer",
} as const;

export type PrivateFileBucket = keyof typeof PRIVATE_FILE_BUCKETS;
export type FileOwnerRole = (typeof PRIVATE_FILE_BUCKETS)[PrivateFileBucket];

export const SIGNED_URL_TTL_SECONDS = 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEGMENT_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;

export function isPrivateFileBucket(value: string): value is PrivateFileBucket {
  return Object.prototype.hasOwnProperty.call(PRIVATE_FILE_BUCKETS, value);
}

/**
 * Validates an object path from the URL and returns its owner id, or null.
 * Rejects traversal, empty segments, and anything outside the upload naming.
 */
export function parsePrivateFilePath(segments: string[]): { path: string; ownerId: string } | null {
  if (segments.length < 2 || segments.length > 4) return null;
  for (const segment of segments) {
    if (!SEGMENT_PATTERN.test(segment) || segment === "." || segment === "..") return null;
  }
  const ownerId = segments[0];
  if (!ownerId || !UUID_PATTERN.test(ownerId)) return null;
  return { path: segments.join("/"), ownerId };
}

/** The app URL stored in the database and shown to users for a private file. */
export function buildPrivateFileUrl(origin: string, bucket: PrivateFileBucket, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${origin}/api/files/${bucket}/${encoded}`;
}

export type FileAccessInput = {
  viewerId: string;
  viewerRole: string | undefined;
  bucket: PrivateFileBucket;
  ownerId: string;
  /** True when an employer has an application from, or a message thread with, the owner. */
  employerLinkedToOwner: boolean;
};

/**
 * Who may open a private file:
 * - the owner;
 * - PESO admins (admin sessions already require MFA in auth());
 * - an employer, for jobseeker files, only when that jobseeker applied to them
 *   or they have exchanged messages.
 * Everyone else is denied, including jobseekers viewing employer documents.
 */
export function canAccessPrivateFile(input: FileAccessInput): boolean {
  const { viewerId, viewerRole, bucket, ownerId, employerLinkedToOwner } = input;
  if (!viewerId) return false;
  if (viewerId === ownerId) return true;
  if (viewerRole === "admin") return true;
  if (viewerRole === "employer" && PRIVATE_FILE_BUCKETS[bucket] === "jobseeker") {
    return employerLinkedToOwner;
  }
  return false;
}
