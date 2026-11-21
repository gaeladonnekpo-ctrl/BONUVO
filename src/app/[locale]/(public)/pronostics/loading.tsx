import { Skeleton } from "@/components/ui/skeleton";

export default function PredictionsLoading() {
  return (
    <div className="space-y-6 py-4">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="flex gap-2 overflow-hidden">
        <Skeleton className="h-9 w-36 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}
