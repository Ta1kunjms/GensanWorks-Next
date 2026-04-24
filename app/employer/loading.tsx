import { Skeleton } from "@/components/ui/skeleton";

export default function EmployerLoading() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar skeleton */}
      <aside className="w-64 bg-slate-900 text-white p-4 hidden md:block">
        <div className="space-y-6">
          <Skeleton className="h-8 w-24 bg-slate-700" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-10 w-full bg-slate-800" />
            ))}
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-72" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-white rounded-lg border">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-white rounded-lg border">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}