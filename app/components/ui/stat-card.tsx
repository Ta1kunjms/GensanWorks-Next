// KPI card: static value (no count-up animation), tabular numbers, and an optional
// change indicator whose direction is also given in text for screen readers.

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn, formatCount } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** Numbers are formatted with formatCount; null/undefined shows "—". */
  value: number | string | null | undefined;
  /** Change versus the previous period, e.g. 12 or -3. 0 is shown as neutral. */
  change?: number | null;
  /** Text after the change, e.g. "vs last month". */
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, value, change, changeLabel, icon, className }: StatCardProps) {
  const display = typeof value === "number" || value == null ? formatCount(value) : value;
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const direction = !hasChange || change === 0 ? "flat" : change > 0 ? "up" : "down";
  const ChangeIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  // Trailing space keeps "Increased by 12" readable as one phrase.
  const directionText = direction === "up" ? "Increased by " : direction === "down" ? "Decreased by " : "No change ";

  return (
    <div className={cn("rounded-lg border bg-card p-4 text-card-foreground", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? (
          <span className="text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {display === "—" ? (
          // Screen readers would announce a bare "—" as "em dash".
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">Not available</span>
          </>
        ) : (
          display
        )}
      </p>
      {hasChange ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-sm tabular-nums",
            direction === "up" && "text-success",
            direction === "down" && "text-destructive",
            direction === "flat" && "text-muted-foreground"
          )}
        >
          <ChangeIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{directionText}</span>
          {direction !== "flat" ? <span>{formatCount(Math.abs(change as number))}</span> : null}
          {changeLabel ? <span className="text-muted-foreground">{changeLabel}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
