"use client";

import { ReactNode } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { PostHogProvider } from "./posthog-provider";
import { Toaster } from "sonner";
import { ConfirmDialogProvider } from "./ui/confirm-dialog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider>
        <ConfirmDialogProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ConfirmDialogProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}
