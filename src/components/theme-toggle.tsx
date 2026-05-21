"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full w-10 h-10 text-slate-400 hover:text-white dark:text-slate-400 dark:hover:text-white hover:bg-slate-800/50 transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-400" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-slate-600" />
      )}
      <span className="sr-only">Tema değiştir</span>
    </Button>
  );
}
