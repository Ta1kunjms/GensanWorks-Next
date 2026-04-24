"use client";

import { useState } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  User, 
  Activity, 
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useAdminAuditLogs } from "@/hooks/use-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

const ACTIONS_FILTER = [
  "profile_update",
  "job_approve",
  "job_reject",
  "job_archive",
  "employer_approve",
  "employer_reject",
  "user_delete",
  "user_role_update"
];

const RESOURCES_FILTER = [
  "jobseeker",
  "job",
  "application",
  "employer_profile",
  "admin_request",
  "system"
];

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    page: 0,
    limit: 15
  });

  const { data, isLoading, error } = useAdminAuditLogs({
    action: filters.action || undefined,
    resourceType: filters.resourceType || undefined,
    limit: filters.limit,
    offset: filters.page * filters.limit
  });

  const logs = data?.data || [];
  const total = data?.pagination?.total || 0;
  const hasMore = (filters.page + 1) * filters.limit < total;

  function getActionBadgeColor(action: string) {
    if (action.includes("approve")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action.includes("reject") || action.includes("delete")) return "bg-rose-50 text-rose-700 border-rose-100";
    if (action.includes("update") || action.includes("archive")) return "bg-blue-50 text-blue-700 border-blue-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <ClipboardList className="w-6 h-6" />
            </div>
            Audit Logs
          </h1>
          <p className="text-slate-600 mt-2">
            Track all sensitive system actions and administrative changes.
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm font-medium">
          <ShieldCheck className="w-4 h-4" />
          System Integrity Verified
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Type</label>
            <div className="relative">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 0 })}
              >
                <option value="">All Actions</option>
                {ACTIONS_FILTER.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resource</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
                value={filters.resourceType}
                onChange={(e) => setFilters({ ...filters, resourceType: e.target.value, page: 0 })}
              >
                <option value="">All Resources</option>
                {RESOURCES_FILTER.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setFilters({ action: "", resourceType: "", page: 0, limit: 15 })}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Admin/User</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Resource</th>
                <th className="px-6 py-4 font-semibold text-slate-700">IP Address</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium text-slate-900">{log.user_id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className={`${getActionBadgeColor(log.action)} capitalize`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium capitalize">{log.resource_type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.resource_id?.slice(0, 8) || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {log.ip_address || "Internal"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-700">{logs.length}</span> of <span className="font-bold text-slate-700">{total}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={filters.page === 0 || isLoading}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs font-medium px-2">Page {filters.page + 1}</div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!hasMore || isLoading}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
