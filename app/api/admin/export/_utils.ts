import { csvDownloadResponse } from "@/lib/legacy-compat";

export function sanitizeRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const formatted: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (value instanceof Date) {
        formatted[key] = value.toISOString();
      } else if (typeof value === "object" && value !== null) {
        formatted[key] = JSON.stringify(value);
      } else {
        formatted[key] = value;
      }
    });
    return formatted;
  });
}

export function exportResponse(
  format: "csv" | "json",
  dataKey: string,
  rows: Array<Record<string, unknown>>,
  filenameBase: string
) {
  const sanitized = sanitizeRows(rows);

  if (format === "json") {
    return Response.json({ [dataKey]: sanitized });
  }

  return csvDownloadResponse(sanitized, filenameBase);
}
