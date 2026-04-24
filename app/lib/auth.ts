import "server-only";
import { createClient } from "./supabase-server";

/**
 * Compatibility layer to replace NextAuth auth() call.
 * This checks the Supabase session and returns a session object
 * compatible with the existing codebase.
 */
export const auth = async () => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Map Supabase user to the session format the app expects
    // We assume role is stored in user_metadata or we fetch it from the database
    const role = user.user_metadata?.role || "jobseeker";
    const name = user.user_metadata?.full_name || 
                 `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 
                 "User";

    return {
      user: {
        id: user.id,
        email: user.email,
        name: name,
        role: role,
        image: user.user_metadata?.avatar_url || null,
      },
      expires: new Date(Date.now() + 3600 * 1000).toISOString(), // Mock expiry
    };
  } catch (error) {
    console.error("[auth] Compatibility layer error:", error);
    return null;
  }
};

// Mock handlers for NextAuth route compatibility (can be removed later)
export const handlers = {
  GET: () => new Response("NextAuth is migrated to Supabase", { status: 200 }),
  POST: () => new Response("NextAuth is migrated to Supabase", { status: 200 }),
};

// Mock signIn/signOut for server-side if needed
export const signIn = async () => {};
export const signOut = async () => {};