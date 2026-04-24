"use client";

import { useEffect } from "react";
import { AdminErrorState } from "@/components/admin-error-state";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Admin Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <AdminErrorState
        title="Application Error"
        message={error.message || "A runtime error occurred in the admin portal."}
        onRetry={() => reset()}
      />
    </div>
  );
}
