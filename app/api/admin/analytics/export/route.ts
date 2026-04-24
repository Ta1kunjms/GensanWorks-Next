import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const APPLICATION_STATUSES = [
  "pending",
  "reviewed",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "withdrawn",
] as const;

const JOB_STATUSES = ["draft", "pending", "active", "closed", "archived"] as const;

type ExportFormat = "csv" | "excel";
type ExportRow = {
  section: string;
  metric: string;
  value: number | string;
};

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function csvEscape(value: string | number | undefined): string {
  const raw = String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function xmlEscape(value: string | number | undefined): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseFormat(request: Request): ExportFormat {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("format") ?? "csv").toLowerCase();

  if (raw === "excel" || raw === "xls" || raw === "xlsx") {
    return "excel";
  }

  return "csv";
}

function buildCsv(rows: ExportRow[]): string {
  const lines = rows.map((row) => [row.section, row.metric, row.value].map(csvEscape).join(","));
  return `${lines.join("\n")}\n`;
}

function buildExcelXml(rows: ExportRow[]): string {
  const tableRows = rows
    .map((row) => {
      const cells = [row.section, row.metric, row.value]
        .map((value) => {
          const isNumeric = typeof value === "number";
          return `<Cell><Data ss:Type="${isNumeric ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
        })
        .join("");

      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Analytics">
    <Table>
      ${tableRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const format = parseFormat(request);

    const [usersCount, employersCount, jobsCount, applicationsCount] = await Promise.all([
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("employers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("applications").select("id", { count: "exact", head: true }),
    ]);

    const [jobStatusResult, applicationStatusResult] = await Promise.all([
      supabaseAdmin.from("jobs").select("status"),
      supabaseAdmin.from("applications").select("status"),
    ]);

    const jobStatusCounts = new Map<string, number>();
    (jobStatusResult.data ?? []).forEach((row: Record<string, unknown>) => {
      const s = String(row.status);
      jobStatusCounts.set(s, (jobStatusCounts.get(s) ?? 0) + 1);
    });

    const applicationStatusCounts = new Map<string, number>();
    (applicationStatusResult.data ?? []).forEach((row: Record<string, unknown>) => {
      const s = String(row.status);
      applicationStatusCounts.set(s, (applicationStatusCounts.get(s) ?? 0) + 1);
    });

    const rows: ExportRow[] = [];
    rows.push({ section: "section", metric: "metric", value: "value" });
    rows.push({ section: "overview", metric: "usersCount", value: usersCount.count ?? 0 });
    rows.push({ section: "overview", metric: "employersCount", value: employersCount.count ?? 0 });
    rows.push({ section: "overview", metric: "jobsCount", value: jobsCount.count ?? 0 });
    rows.push({ section: "overview", metric: "applicationsCount", value: applicationsCount.count ?? 0 });

    JOB_STATUSES.forEach((status) => {
      rows.push({ section: "jobStatus", metric: status, value: jobStatusCounts.get(status) ?? 0 });
    });

    APPLICATION_STATUSES.forEach((status) => {
      rows.push({ section: "applicationStatus", metric: status, value: applicationStatusCounts.get(status) ?? 0 });
    });

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);

    if (format === "excel") {
      const filename = `admin-analytics-${datePart}.xls`;
      return new NextResponse(buildExcelXml(rows), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename=${filename}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const filename = `admin-analytics-${datePart}.csv`;
    return new NextResponse(buildCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin analytics export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}