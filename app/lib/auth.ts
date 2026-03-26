import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usersTable, employersTable, adminsTable } from "@/db/schema";
import type { NextAuthConfig } from "next-auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
  );
}

export const authConfig = {
  providers: [
    // Email/Password Login
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const { email, password, role } = credentials;

        try {
          // Check based on role
          if (role === "admin") {
            // Admin login
            const [admin] = await db
              .select()
              .from(adminsTable)
              .where(eq(adminsTable.email, email as string));

            if (!admin) {
              throw new Error("Invalid credentials");
            }

            const passwordMatch = await bcrypt.compare(
              password as string,
              admin.passwordHash
            );

            if (!passwordMatch) {
              throw new Error("Invalid credentials");
            }

            return {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              role: "admin",
              image: null,
            };
          } else if (role === "employer") {
            // Employer login
            const [employer] = await db
              .select()
              .from(employersTable)
              .where(eq(employersTable.email, email as string));

            if (!employer) {
              throw new Error("Invalid credentials");
            }

            if (!employer.passwordHash) {
              throw new Error("Employer account not configured");
            }

            const passwordMatch = await bcrypt.compare(
              password as string,
              employer.passwordHash
            );

            if (!passwordMatch) {
              throw new Error("Invalid credentials");
            }

            return {
              id: employer.id,
              email: employer.email,
              name: employer.contactPerson,
              role: "employer",
              image: employer.logoUrl,
            };
          } else {
            // Jobseeker login
            const [user] = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.email, email as string));

            if (!user) {
              throw new Error("Invalid credentials");
            }

            if (!user.passwordHash) {
              throw new Error("User account not configured");
            }

            const passwordMatch = await bcrypt.compare(
              password as string,
              user.passwordHash
            );

            if (!passwordMatch) {
              throw new Error("Invalid credentials");
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: "jobseeker",
              image: user.profileImage,
            };
          }
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),

    // Google OAuth
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    encryption: true,
  },

  callbacks: {
    async signIn({ user, account, email, profile, isNewUser }) {
      // Allow all signins
      return true;
    },

    async jwt({ token, user, account, profile, isNewUser }) {
      // Add custom fields to JWT
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "jobseeker";
        token.image = user.image;
      }

      return token;
    },

    async session({ session, token }) {
      // Add token details to session
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        session.user.image = token.image;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Only allow redirect to URLs within our app
      if (url.startsWith("/")) return url;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  trust_host: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
