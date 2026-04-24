"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryFetcher } from "@/lib/query-fetcher";
import type { AdminJob, AdminSummary } from "@/lib/dashboard-data";

/**
 * Hook for fetching admin summary statistics
 */
export function useAdminSummary() {
  return useQuery<AdminSummary>({
    queryKey: ["admin", "summary"],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => queryFetcher<AdminSummary>("/api/admin/summary"),
  });
}

/**
 * Hook for fetching admin jobs with filtering
 */
export function useAdminJobs(filters: { status?: string; search?: string; limit?: number; offset?: number } = {}) {
  const queryParams = new URLSearchParams();
  if (filters.status && filters.status !== "all") queryParams.append("status", filters.status);
  if (filters.search) queryParams.append("search", filters.search);
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.offset) queryParams.append("offset", filters.offset.toString());

  const queryString = queryParams.toString();
  const url = `/api/admin/jobs${queryString ? `?${queryString}` : ""}`;

  return useQuery<{ data: AdminJob[]; pagination: { total: number } }>({
    queryKey: ["admin", "jobs", filters],
    queryFn: () => queryFetcher<{ data: AdminJob[]; pagination: { total: number } }>(url),
  });
}

/**
 * Hook for fetching admin users with filtering
 */
export function useAdminUsers(filters: { role?: string; search?: string; limit?: number; offset?: number } = {}) {
  const queryParams = new URLSearchParams();
  if (filters.role && filters.role !== "all") queryParams.append("role", filters.role);
  if (filters.search) queryParams.append("search", filters.search);
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.offset) queryParams.append("offset", filters.offset.toString());

  const queryString = queryParams.toString();
  const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;

  return useQuery<{ data: any[]; pagination: { total: number } }>({
    queryKey: ["admin", "users", filters],
    queryFn: () => queryFetcher<{ data: any[]; pagination: { total: number } }>(url),
  });
}

/**
 * Hook for fetching admin analytics
 */
export function useAdminAnalytics() {
  return useQuery<any>({
    queryKey: ["admin", "analytics"],
    queryFn: () => queryFetcher<any>("/api/admin/analytics"),
  });
}

/**
 * Hook for fetching admin referrals analytics
 */
export function useAdminReferralsAnalytics() {
  return useQuery<any>({
    queryKey: ["admin", "analytics", "referrals"],
    queryFn: () => queryFetcher<any>("/api/admin/analytics/referrals"),
  });
}

/**
 * Hook for fetching audit logs
 */
export function useAdminAuditLogs(filters: { userId?: string; action?: string; resourceType?: string; limit?: number; offset?: number } = {}) {
  const queryParams = new URLSearchParams();
  if (filters.userId) queryParams.append("userId", filters.userId);
  if (filters.action) queryParams.append("action", filters.action);
  if (filters.resourceType) queryParams.append("resourceType", filters.resourceType);
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.offset) queryParams.append("offset", filters.offset.toString());

  const queryString = queryParams.toString();
  const url = `/api/admin/audit-logs${queryString ? `?${queryString}` : ""}`;

  return useQuery<{ data: any[]; pagination: { total: number } }>({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: () => queryFetcher<{ data: any[]; pagination: { total: number } }>(url),
  });
}

/**
 * Hook for updating job status
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update job status");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
}
