import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-sm outline-none transition-colors",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25",
        "aria-invalid:border-destructive/60 aria-invalid:ring-destructive/20",
        "resize-y disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
