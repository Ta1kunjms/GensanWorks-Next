/**
 * Authentication Utilities
 * Helper functions for common auth operations used across endpoints
 */

import { db } from "./db";

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

  if (role === "admin") {
    const { data } = await db
      .from("admins")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();
    if (data) return { id: data.id, role: "admin", email: data.email };
  } else if (role === "employer") {
    const { data } = await db
      .from("employers")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();
    if (data) return { id: data.id, role: "employer", email: data.email };
  } else {
    // Search all tables
    const [{ data: admin }, { data: employer }, { data: user }] = await Promise.all([
      db.from("admins").select("id, email").eq("email", normalizedEmail).single(),
      db.from("employers").select("id, email").eq("email", normalizedEmail).single(),
      db.from("jobseekers").select("id, email").eq("email", normalizedEmail).single(),
    ]);
    if (admin) return { id: admin.id, role: "admin", email: admin.email };
    if (employer) return { id: employer.id, role: "employer", email: employer.email };
    if (user) return { id: user.id, role: "jobseeker", email: user.email };
  }
  return null;
}

/**
 * Get password hash for a user account
 */
export async function getPasswordHash(userId: string, role: AccountType): Promise<string | null> {
  const table = role === "admin" ? "admins" : role === "employer" ? "employers" : "jobseekers";
  const { data } = await db.from(table).select("password_hash").eq("id", userId).single();
  return data?.password_hash ?? null;
}

/**
 * Update password for a user
 */
export async function updatePasswordHash(userId: string, role: AccountType, newHash: string): Promise<boolean> {
  const table = role === "admin" ? "admins" : role === "employer" ? "employers" : "jobseekers";
  const { error } = await db
    .from(table)
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}

// Alias for backward compatibility
export const updatePassword = updatePasswordHash;

/**
 * Get user profile for a role
 */
export async function getUserProfile(userId: string, role: AccountType) {
  const table = role === "admin" ? "admins" : role === "employer" ? "employers" : "jobseekers";
  return db.from(table).select("*").eq("id", userId).single();
}

/**
 * Find account by ID
 */
export async function findAccountById(userId: string, role: AccountType): Promise<UserAccount | null> {
  const table = role === "admin" ? "admins" : role === "employer" ? "employers" : "jobseekers";
  const { data } = await db.from(table).select("id, email").eq("id", userId).single();
  if (!data) return null;
  return { id: data.id, role, email: data.email };
}