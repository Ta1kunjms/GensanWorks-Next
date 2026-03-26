import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables (URL and ANON_KEY)"
  );
}

// Client for browser (public operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (admin operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey
);

// Storage bucket helpers
export const STORAGE_BUCKETS = {
  resumes: "resumes",
  profileImages: "profile-images",
  employerDocs: "employer-documents",
  jobAttachments: "job-attachments",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
