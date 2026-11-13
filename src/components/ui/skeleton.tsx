import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_25%,rgb(143_143_171/0.14)_50%,var(--muted)_75%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
