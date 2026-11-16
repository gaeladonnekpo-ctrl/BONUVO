import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function OfferCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)} aria-busy="true">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}
