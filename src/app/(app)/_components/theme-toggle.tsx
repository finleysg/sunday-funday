"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      suppressHydrationWarning
    >
      <SunIcon className="hidden dark:inline" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}
