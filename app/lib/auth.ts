import "server-only";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (!authSecret) {
  const message = "Missing auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET.";
  if (isProduction) throw new Error(message);
  console.warn(message);
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getUserWithPassword(email: string, role: string) {
  const emailLower = email.toLowerCase();
  const table = role === "admin" ? "admins" : role === "employer" ? "employers" : "users";
  const { data, error } = await supabase
    .from(table)
    .select("id, email, name, password_hash, profile_image, logo_url")
    .eq("email", emailLower)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    password_hash: data.password_hash,
    image: role === "employer" ? data.logo_url : data.profile_image,
    role,
  };
}

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const requestedRole = String(credentials.role ?? "jobseeker").toLowerCase();

        try {
          const user = await getUserWithPassword(email, requestedRole);
          if (!user || !user.password_hash) return null;

          const passwordMatch = await bcrypt.compare(password, user.password_hash);
          if (!passwordMatch) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image ?? null,
          };
        } catch (error) {
          console.error("Auth failure:", error);
          return null;
        }
      },
    }),
    ...(googleClientId && googleClientSecret ? [GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    })] : []),
  ],

  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "jobseeker";
        token.image = user.image;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = typeof token.role === "string" ? token.role : "jobseeker";
        session.user.image = (token.image as string | null | undefined) ?? null;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  logger: {
    error(code, ...message) {
      const codeText = typeof code === "string" ? code : 
        code instanceof Error ? code.name : String(code);
      if (codeText === "CredentialsSignin") return;
      console.error(`[auth] ${codeText}`, ...message);
    },
  },

  trustHost: true,
  secret: authSecret,
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authConfig);