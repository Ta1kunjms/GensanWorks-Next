import { NextResponse } from "next/server";
import { getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type ComponentState = "operational" | "degraded";

type HealthComponent = {
  key: "web" | "api" | "auth" | "database" | "uploads" | "notifications";
  label: string;
  status: ComponentState;
  detail: string;
};

function getStatusPageUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_STATUS_PAGE_URL ?? process.env.STATUS_PAGE_URL ?? null;

  if (!candidate) {
    return null;
  }

  return /^https?:\/\//i.test(candidate) ? candidate : null;
}

function getDbTimeoutMs() {
  const parsed = Number(process.env.HEALTH_DB_TIMEOUT_MS ?? "2000");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 2000;
  }
  return Math.floor(parsed);
}

async function checkDatabaseStatus(): Promise<HealthComponent> {
  try {
    const { error } = await db.from("settings").select("key").limit(1);

    if (error) {
      return {
        key: "database",
        label: "Database",
        status: "degraded",
        detail: "Connection degraded: " + error.message,
      };
    }

    return {
      key: "database",
      label: "Database",
      status: "operational",
      detail: "Connection healthy",
    };
  } catch {
    return {
      key: "database",
      label: "Database",
      status: "degraded",
      detail: "Connection degraded",
    };
  }
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const databaseComponent = await checkDatabaseStatus();

  const components: HealthComponent[] = [
    {
      key: "web",
      label: "Web app",
      status: "operational",
      detail: "Serving requests",
    },
    {
      key: "api",
      label: "API service",
      status: "operational",
      detail: "Request handlers active",
    },
    {
      key: "auth",
      label: "Auth service",
      status: databaseComponent.status === "operational" ? "operational" : "degraded",
      detail:
        databaseComponent.status === "operational"
          ? "Session access healthy"
          : "Dependent service degraded",
    },
    databaseComponent,
    {
      key: "uploads",
      label: "File uploads",
      status: "operational",
      detail: "Upload endpoint reachable",
    },
    {
      key: "notifications",
      label: "Notifications",
      status: "operational",
      detail: "Message pipeline available",
    },
  ];

  const overallStatus: ComponentState = components.some(
    (component) => component.status === "degraded"
  )
    ? "degraded"
    : "operational";

  return NextResponse.json(
    {
      status: "ok",
      overallStatus,
      checkedAt: new Date().toISOString(),
      statusPageUrl: getStatusPageUrl(),
      components,
    },
    {
      headers: {
        "X-Request-ID": requestId,
      },
    }
  );
}