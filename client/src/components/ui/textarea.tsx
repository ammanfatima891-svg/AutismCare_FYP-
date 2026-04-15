import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-input-background dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-xl border-2 px-4 py-3 text-base text-foreground shadow-xs outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
