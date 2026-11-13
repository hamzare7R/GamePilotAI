import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingBadgeProps = {
  rating?: number;
  className?: string;
};

export function RatingBadge({ rating, className }: RatingBadgeProps) {
  if (rating === undefined) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-300/25 bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur-md",
        className,
      )}
    >
      <Star className="size-3 fill-amber-300 text-amber-300" aria-hidden="true" />
      {rating.toFixed(1)}
    </span>
  );
}
