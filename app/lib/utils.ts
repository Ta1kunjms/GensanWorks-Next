import { clsx, type ClassValue } from "clsx";
import bcrypt from "bcryptjs";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDatetime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const countFormatter = new Intl.NumberFormat("en-PH");

/** Count display with en-PH digit grouping; missing or invalid values show "—". */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  // `n || 0` turns -0 into 0 so it never renders as "-0".
  return countFormatter.format(n || 0);
}

/** Philippine peso display, e.g. "₱1,234.00" or compact "₱1.2K"; missing values show "—". */
export function formatPeso(
  n: number | null | undefined,
  options: { compact?: boolean } = {}
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    ...(options.compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(n || 0);
}

export function capitalizeString(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
