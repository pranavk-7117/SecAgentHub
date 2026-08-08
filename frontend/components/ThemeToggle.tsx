"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`relative grid h-8 w-8 place-items-center rounded-lg border transition-all duration-200
        ${theme === "dark"
          ? "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
          : "border-black/[0.08] bg-black/[0.04] text-slate-600 hover:bg-black/[0.08] hover:text-slate-900"}
        ${className}`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
    >
      {theme === "dark"
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
    </button>
  );
}
