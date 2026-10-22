"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  message: React.ReactNode;
  /** Shows a Retry button when provided. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Heading element for the title; match the page outline (default h2). */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retrying = false,
  headingLevel: Heading = "h2",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-8 text-center",
        className
      )}
    >
      <AlertCircle className="mb-2 h-6 w-6 text-destructive" aria-hidden="true" />
      <Heading className="text-base font-semibold text-foreground">{title}</Heading>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry} loading={retrying}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
