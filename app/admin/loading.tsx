import {
  LoadingRegion,
  PageHeaderSkeleton,
  StatGridSkeleton,
  TableSkeleton,
} from "@/components/ui/skeletons";

// Content-area skeleton only: the admin layout already renders the sidebar and header.
export default function AdminLoading() {
  return (
    <LoadingRegion className="space-y-6">
      <PageHeaderSkeleton />
      <StatGridSkeleton count={4} announce={false} />
      <TableSkeleton rows={6} cols={5} announce={false} />
    </LoadingRegion>
  );
}
