// Offline unit-test defaults, loaded via `--import` before any test file.
// Placeholders only: never real credentials. Values already set in the
// environment are kept, and tests block network access themselves.
const env = process.env as Record<string, string | undefined>;

env.NODE_ENV ??= "test";
env.NEXT_PUBLIC_SUPABASE_URL ??= "https://placeholder.invalid";
env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-placeholder";
env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-placeholder";
