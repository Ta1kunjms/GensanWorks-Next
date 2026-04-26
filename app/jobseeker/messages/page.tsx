export const dynamic = "force-dynamic";
"use client";
import { useAuth } from "@/lib/auth-client";
import { RealtimeChat } from "@/components/messaging/realtime-chat";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobseekerMessagesPage() {
  const { data: session, status } = useAuth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (status === "loading") return <Skeleton className="h-[calc(100vh-8rem)] rounded-2xl" />;
  if (!userId) return null;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time conversations with employers</p>
      </div>
      <RealtimeChat currentUserId={userId} currentUserRole="jobseeker" />
    </div>
  );
}
