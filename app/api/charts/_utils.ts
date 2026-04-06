import { usersTable } from "@/db/schema";
import { db } from "@/lib/db";
import { isInDateRange, parseDateRangeFromUrl } from "@/lib/legacy-compat";

export type EmploymentStatusBucket = "employed" | "unemployed" | "selfEmployed" | "newEntrant";

function normalizeStatusValue(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  return String(raw)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyLegacyStatus(rawStatus: unknown): EmploymentStatusBucket | null {
  const normalized = normalizeStatusValue(rawStatus);
  if (!normalized) return null;

  const contains = (needle: string) => normalized.includes(needle);

  if (
    contains("self employ") ||
    contains("entrepreneur") ||
    contains("business owner") ||
    contains("freelanc")
  ) {
    return "selfEmployed";
  }

  if (
    contains("new entrant") ||
    contains("fresh graduate") ||
    contains("first time job") ||
    contains("first time worker") ||
    contains("new worker") ||
    contains("student") ||
    contains("recent graduate")
  ) {
    return "newEntrant";
  }

  if (
    contains("unemploy") ||
    contains("underemploy") ||
    contains("jobless") ||
    contains("no work") ||
    contains("without work")
  ) {
    return "unemployed";
  }

  if (
    (contains("wage") && contains("employ")) ||
    (contains("employed") && !contains("unemploy")) ||
    contains("with work") ||
    contains("currently working") ||
    contains("working full time") ||
    contains("working part time")
  ) {
    return "employed";
  }

  return null;
}

export function classifyEmploymentStatus(source: unknown): EmploymentStatusBucket | null {
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const data = source as Record<string, unknown>;
    const status = normalizeStatusValue(data.employmentStatus ?? data.employment_status);

    if (status === "employed" || status === "wage employed") {
      return "employed";
    }

    if (status === "unemployed") {
      return "unemployed";
    }

    if (status === "self employed" || status === "freelancer") {
      return "selfEmployed";
    }

    if (status === "new entrant") {
      return "newEntrant";
    }

    if (status) {
      return classifyLegacyStatus(status);
    }
  }

  return classifyLegacyStatus(source);
}

export async function getUsersFilteredByDate(url: string) {
  const { start, end } = parseDateRangeFromUrl(url);
  const users = await db
    .select({
      id: usersTable.id,
      city: usersTable.city,
      createdAt: usersTable.createdAt,
      employmentStatus: usersTable.employmentStatus,
      employmentType: usersTable.employmentType,
    })
    .from(usersTable);

  return users.filter((user) => isInDateRange(user.createdAt, start, end));
}
