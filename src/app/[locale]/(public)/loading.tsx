import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-9 w-2/3 max-w-md rounded-xl" />
        <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    </div>
  );
}
