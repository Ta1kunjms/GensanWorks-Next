"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ComponentState = "operational" | "degraded";

type HealthComponent = {
  key: string;
  label: string;
  status: ComponentState;
  detail: string;
};

type HealthPayload = {
  status?: string;
  overallStatus?: ComponentState;
  checkedAt?: string;
  statusPageUrl?: string | null;
  components?: HealthComponent[];
};

const fallbackComponents: HealthComponent[] = [
  { key: "web", label: "Web app", status: "operational", detail: "No active incidents" },
  { key: "api", label: "API service", status: "operational", detail: "No active incidents" },
  { key: "auth", label: "Auth service", status: "operational", detail: "No active incidents" },
  { key: "database", label: "Database", status: "operational", detail: "No active incidents" },
  { key: "uploads", label: "File uploads", status: "operational", detail: "No active incidents" },
  {
    key: "notifications",
    label: "Notifications",
    status: "operational",
    detail: "No active incidents",
  },
];

function statusBadgeClass(status: ComponentState) {
  return status === "operational"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";
}

function statusLabel(status: ComponentState) {
  return status === "operational" ? "Operational" : "Degraded";
}

export default function StatusPage() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Health endpoint returned ${response.status}`);
        }

        const healthPayload = (await response.json()) as HealthPayload;
        if (!isMounted) {
          return;
        }
        setPayload(healthPayload);
        setError(null);
      } catch {
        if (!isMounted) {
          return;
        }
        setError("Unable to refresh service status right now.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();
    const refreshTimer = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const components = payload?.components?.length
    ? payload.components
    : fallbackComponents;

  const overallStatus = payload?.overallStatus ?? "operational";

  const statusPageUrl = useMemo(
    () => payload?.statusPageUrl ?? process.env.NEXT_PUBLIC_STATUS_PAGE_URL ?? null,
    [payload?.statusPageUrl]
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-6">
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">System Status</h1>
            <p className="text-sm text-muted-foreground">
              Live service availability for core platform components.
            </p>
            <div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                  overallStatus
                )}`}
              >
                Overall: {statusLabel(overallStatus)}
              </span>
            </div>
            {payload?.checkedAt ? (
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(payload.checkedAt).toLocaleString()}
              </p>
            ) : null}
          </header>

          {error ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {error}
            </div>
          ) : null}

          {statusPageUrl ? (
            <div className="rounded-lg border bg-card px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                For incident history and subscriber notifications, open the hosted status provider.
              </p>
              <Link
                href={statusPageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Open hosted status page
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
              Hosted provider URL not configured yet. Set NEXT_PUBLIC_STATUS_PAGE_URL to publish an external status portal.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Component</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {components.map((component) => (
                  <tr key={component.key} className="border-t">
                    <td className="px-4 py-3 font-medium">{component.label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          component.status
                        )}`}
                      >
                        {statusLabel(component.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{component.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Refreshing status...</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}