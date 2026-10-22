import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Optional call to action, e.g. a Button or Link. */
  action?: React.ReactNode;
  /** Heading element for the title; match the page outline (default h2). */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel: Heading = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed bg-muted/40 px-6 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-3 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Heading className="text-base font-semibold text-foreground">{title}</Heading>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
