"use client";

import { useSession } from "next-auth/react";

type AuthFetchInit = RequestInit & {
  headers?: HeadersInit;
};

type AuthUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  company?: string | null;
};

export function useAuth() {
  const session = useSession();
  const user = (session.data?.user ?? null) as AuthUser | null;

  return {
    ...session,
    user,
  };
}

export async function authFetch(input: RequestInfo | URL, init: AuthFetchInit = {}) {
  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      ...(init.headers ?? {}),
    },
  });
}
