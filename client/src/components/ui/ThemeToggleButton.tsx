import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { cn } from "./utils";

type ThemeToggleButtonProps = {
  className?: string;
  /** Passed through for layout shells (e.g. clinical vs default spacing). */
  variant?: "default" | "minimal";
};

export function ThemeToggleButton({ className, variant = "default" }: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative shrink-0 rounded-full p-2 transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        variant === "minimal" && "p-1.5",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
