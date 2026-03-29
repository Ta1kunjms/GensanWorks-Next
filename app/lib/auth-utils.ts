/**
 * Authentication Utilities
 * Helper functions for common auth operations used across endpoints
 */

import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { usersTable, employersTable, adminsTable } from "@/db/schema";

export type AccountType = "admin" | "employer" | "jobseeker";

export interface UserAccount {
  id: string;
  role: AccountType;
  email: string;
}

/**
 * Find user account across all tables
 * Useful for password reset, profile lookup, etc.
 */
export async function findAccountByEmail(
  email: string,
  role?: AccountType
): Promise<UserAccount | null> {
  const normalizedEmail = email.toLowerCase().trim();

  // Search specific role if provided
  if (role === "admin") {
    const [admin] = await db
      .select({ id: adminsTable.id, email: adminsTable.email })
      .from(adminsTable)
      .where(eq(adminsTable.email, normalizedEmail))
      .limit(1);
    return admin ? { id: admin.id, role: "admin", email: admin.email } : null;
  }

  if (role === "employer") {
    const [employer] = await db
      .select({ id: employersTable.id, email: employersTable.email })
      .from(employersTable)
      .where(eq(employersTable.email, normalizedEmail))
      .limit(1);
    return employer ? { id: employer.id, role: "employer", email: employer.email } : null;
  }

  if (role === "jobseeker") {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);
    return user ? { id: user.id, role: "jobseeker", email: user.email } : null;
  }

  // Search all roles
  const [admin, employer, user] = await Promise.all([
    db
      .select({ id: adminsTable.id, email: adminsTable.email })
      .from(adminsTable)
      .where(eq(adminsTable.email, normalizedEmail))
      .limit(1),
    db
      .select({ id: employersTable.id, email: employersTable.email })
      .from(employersTable)
      .where(eq(employersTable.email, normalizedEmail))
      .limit(1),
    db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1),
  ]);

  if (admin[0]) return { id: admin[0].id, role: "admin", email: admin[0].email };
  if (employer[0]) return { id: employer[0].id, role: "employer", email: employer[0].email };
  if (user[0]) return { id: user[0].id, role: "jobseeker", email: user[0].email };

  return null;
}

/**
 * Check if email is already registered across all user types
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const account = await findAccountByEmail(email);
  return account !== null;
}

/**
 * Get user profile by ID and role
 */
export async function getUserProfile(id: string, role: AccountType) {
  try {
    if (role === "admin") {
      const [admin] = await db
        .select()
        .from(adminsTable)
        .where(and(eq(adminsTable.id, id), eq(adminsTable.isActive, true)))
        .limit(1);
      return admin || null;
    }

    if (role === "employer") {
      const [employer] = await db
        .select()
        .from(employersTable)
        .where(and(eq(employersTable.id, id), eq(employersTable.isActive, true)))
        .limit(1);
      return employer || null;
    }

    if (role === "jobseeker") {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.id, id), eq(usersTable.isActive, true)))
        .limit(1);
      return user || null;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", { id, role, error });
    return null;
  }
}

/**
 * Get password hash for a user by ID and role
 */
export async function getPasswordHash(id: string, role: AccountType): Promise<string | null> {
  try {
    if (role === "admin") {
      const [admin] = await db
        .select({ passwordHash: adminsTable.passwordHash })
        .from(adminsTable)
        .where(eq(adminsTable.id, id))
        .limit(1);
      return admin?.passwordHash || null;
    }

    if (role === "employer") {
      const [employer] = await db
        .select({ passwordHash: employersTable.passwordHash })
        .from(employersTable)
        .where(eq(employersTable.id, id))
        .limit(1);
      return employer?.passwordHash || null;
    }

    if (role === "jobseeker") {
      const [user] = await db
        .select({ passwordHash: usersTable.passwordHash })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      return user?.passwordHash || null;
    }

    return null;
  } catch (error) {
    console.error("Error fetching password hash:", { id, role, error });
    return null;
  }
}

/**
 * Update password for a user by ID and role
 */
export async function updatePassword(id: string, role: AccountType, passwordHash: string): Promise<boolean> {
  try {
    const now = new Date();

    if (role === "admin") {
      await db
        .update(adminsTable)
        .set({ passwordHash, updatedAt: now })
        .where(eq(adminsTable.id, id));
      return true;
    }

    if (role === "employer") {
      await db
        .update(employersTable)
        .set({ passwordHash, updatedAt: now })
        .where(eq(employersTable.id, id));
      return true;
    }

    if (role === "jobseeker") {
      await db
        .update(usersTable)
        .set({ passwordHash, updatedAt: now })
        .where(eq(usersTable.id, id));
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error updating password:", { id, role, error });
    return false;
  }
}
