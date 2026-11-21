import { Skeleton } from "@/components/ui/skeleton";

export default function OffersLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}
