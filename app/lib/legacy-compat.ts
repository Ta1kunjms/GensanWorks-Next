import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";

export type SessionIdentity = {
  userId: string;
  role: string;
  email: string | null;
  name: string | null;
};

function csvEscape(value: unknown): string {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return "";
  }

  const firstRow = rows.at(0);
  if (!firstRow) {
    return "";
  }

  const headers = Object.keys(firstRow);
  const lines = [headers.map(csvEscape).join(",")];

  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  });

  return `${lines.join("\n")}\n`;
}

export function csvDownloadResponse(rows: Array<Record<string, unknown>>, filenameBase: string) {
  const csv = toCsv(rows);
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `${filenameBase}_export_${datePart}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}

export function readFormatFromUrl(url: string): "csv" | "json" {
  const searchParams = new URL(url).searchParams;
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  return format === "json" ? "json" : "csv";
}

export function parseDateRangeFromUrl(url: string) {
  const searchParams = new URL(url).searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return { start: null as Date | null, end: null as Date | null };
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { start: null as Date | null, end: null as Date | null };
  }

  return { start, end };
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const session = await auth();
  const user = session?.user as
    | { id?: string; role?: string; email?: string; name?: string }
    | undefined;

  if (!user?.id || !user.role) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    email: user.email ?? null,
    name: user.name ?? null,
  };
}

export async function ensureAuthenticated(req: Request) {
  const requestId = getRequestId(req);
  const identity = await getSessionIdentity();

  if (!identity) {
    return {
      identity: null,
      requestId,
      unauthorizedResponse: NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 401 }
      ),
    };
  }

  return { identity, requestId, unauthorizedResponse: null as NextResponse | null };
}

export async function ensureAdmin(req: Request) {
  const authResult = await ensureAuthenticated(req);

  if (authResult.unauthorizedResponse) {
    return {
      ...authResult,
      forbiddenResponse: null as NextResponse | null,
    };
  }

  if (authResult.identity?.role !== "admin") {
    return {
      ...authResult,
      forbiddenResponse: NextResponse.json(
        { error: "Unauthorized", requestId: authResult.requestId },
        { status: 401 }
      ),
    };
  }

  return {
    ...authResult,
    forbiddenResponse: null as NextResponse | null,
  };
}

export function isInDateRange(
  value: Date | string | null | undefined,
  start: Date | null,
  end: Date | null
) {
  if (!start || !end) {
    return true;
  }

  if (!value) {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date >= start && date <= end;
}
