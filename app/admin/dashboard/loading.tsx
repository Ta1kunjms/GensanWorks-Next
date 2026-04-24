import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-72 w-full rounded" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-64 w-full rounded" />
        </div>
      </div>

      {/* Referral Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Employers */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-white p-4"
            >
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Job Moderation Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="px-6 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="px-6 py-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="px-6 py-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="px-6 py-3 text-left">
                  <Skeleton className="h-4 w-14" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-7 w-14" />
                      <Skeleton className="h-7 w-14" />
                      <Skeleton className="h-7 w-14" />
                      <Skeleton className="h-7 w-14" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Account Section */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}