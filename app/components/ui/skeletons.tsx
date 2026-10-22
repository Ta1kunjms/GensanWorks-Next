// Layout skeletons for loading states. Each wrapper announces "Loading…" once to
// screen readers; the blocks themselves are aria-hidden (see Skeleton).
// No aria-busy here: it would suppress the status announcement. Put aria-busy on
// the region whose content the skeleton stands in for, if needed.

import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingRegion({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

export function StatGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <LoadingRegion className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {range(count).map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <LoadingRegion className={cn("w-full overflow-hidden rounded-lg border", className)}>
      {range(rows + 1).map((r) => (
        <div key={r} className={cn("flex gap-4 px-4 py-3", r > 0 && "border-t")}>
          {range(cols).map((c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", r === 0 && "h-3")} />
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}

export function CardListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <LoadingRegion className={cn("space-y-3", className)}>
      {range(count).map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/4" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <LoadingRegion className={cn("space-y-4", className)}>
      {range(fields).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </LoadingRegion>
  );
}

export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </LoadingRegion>
  );
}
