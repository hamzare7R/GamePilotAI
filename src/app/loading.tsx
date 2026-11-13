import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
