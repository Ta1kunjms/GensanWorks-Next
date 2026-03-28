import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usersTable, employersTable, adminsTable } from "@/db/schema";
import type { NextAuthConfig } from "next-auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (!authSecret) {
  const message =
    "Missing auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET before starting the app.";
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(message);
}

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
  );
}

export const authConfig: NextAuthConfig = {
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
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const role = String(credentials.role ?? "jobseeker").toLowerCase();

        try {
          // Check based on role
          if (role === "admin") {
            // Admin login
            const [admin] = await db
              .select()
              .from(adminsTable)
              .where(eq(adminsTable.email, email));

            if (!admin) {
              return null;
            }

            const passwordMatch = await bcrypt.compare(password, admin.passwordHash);

            if (!passwordMatch) {
              return null;
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
              .where(eq(employersTable.email, email));

            if (!employer) {
              return null;
            }

            if (!employer.passwordHash) {
              return null;
            }

            const passwordMatch = await bcrypt.compare(password, employer.passwordHash);

            if (!passwordMatch) {
              return null;
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
              .where(eq(usersTable.email, email));

            if (!user) {
              return null;
            }

            if (!user.passwordHash) {
              return null;
            }

            const passwordMatch = await bcrypt.compare(password, user.passwordHash);

            if (!passwordMatch) {
              return null;
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
          console.error("Auth authorize failure:", error);
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
  },

  callbacks: {
    async signIn() {
      // Allow all signins
      return true;
    },

    async jwt({ token, user }) {
      // Add custom fields to JWT
      if (user) {
        const authUser = user as typeof user & { role?: string };
        token.id = user.id;
        token.role = authUser.role ?? "jobseeker";
        token.image = user.image;
      }

      return token;
    },

    async session({ session, token }) {
      // Add token details to session
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role =
          typeof token.role === "string" ? token.role : "jobseeker";
        session.user.image = (token.image as string | null | undefined) ?? null;
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

  logger: {
    error(code, ...message) {
      const codeText =
        typeof code === "string"
          ? code
          : code instanceof Error
            ? code.name
            : String(code);

      // CredentialsSignin is expected for invalid logins; avoid noisy stack traces.
      if (codeText === "CredentialsSignin") return;
      console.error(`[auth][error] ${codeText}`, ...message);
    },
  },

  trustHost: true,
  secret: authSecret,
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authConfig);
