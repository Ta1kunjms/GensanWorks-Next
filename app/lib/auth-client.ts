"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase-client";

type AuthUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  company?: string | null;
};

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.user_metadata?.full_name || "User",
    role: session.user.user_metadata?.role || "jobseeker",
    image: session.user.user_metadata?.avatar_url || null,
  } as AuthUser : null;

  return {
    data: session ? { user } : null,
    status: loading ? "loading" : session ? "authenticated" : "unauthenticated",
    user,
  };
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  // Since we are using Supabase sessions (cookies), fetch will automatically include them
  return fetch(input, {
    ...init,
  });
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}
