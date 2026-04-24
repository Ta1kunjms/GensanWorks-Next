import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex h-screen bg-slate-900 p-5 lg:p-6">
      {/* Sidebar skeleton */}
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-full lg:shrink-0">
        <aside className="w-64 bg-slate-800 rounded-lg p-4 space-y-6">
          <Skeleton className="h-10 w-24 bg-slate-700" />
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Skeleton key={i} className="h-9 w-full bg-slate-700" />
            ))}
          </div>
        </aside>
      </div>

      {/* Main content skeleton */}
      <div className="flex flex-1 flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        {/* Mobile header skeleton */}
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 bg-slate-200" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-24 bg-slate-200" />
          </div>
        </div>

        {/* Dashboard content skeleton */}
        <main className="min-h-0 flex-1 overflow-auto p-6 lg:p-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-72" />
          </div>

          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 bg-white rounded-lg border">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="p-6 bg-white rounded-lg border">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>

          {/* Table skeleton */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}