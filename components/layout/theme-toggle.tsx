"use client";

import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => setMounted(true), []);

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (!mounted) return <div className="w-[52px] h-[28px]" />;

  return (
    <button
      onClick={toggle}
      className="relative w-[52px] h-[28px] rounded-full p-[3px] transition-colors duration-300 focus:outline-none"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1e1a2e, #2a2440)"
          : "linear-gradient(135deg, #e8e2f0, #d4cce0)",
        boxShadow: isDark
          ? "inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.05)"
          : "inset 0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(255,255,255,0.6)",
      }}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <Sun className="absolute left-[6px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400 opacity-60" />
      <Moon className="absolute right-[6px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-300 opacity-60" />

      {/* Thumb */}
      <div
        className="h-[22px] w-[22px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center"
        style={{
          transform: isDark ? "translateX(24px)" : "translateX(0)",
          background: isDark ? "#a88adc" : "#ffffff",
          boxShadow: isDark
            ? "0 2px 8px rgba(168,138,220,0.4), inset 0 1px 2px rgba(255,255,255,0.2)"
            : "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.8)",
        }}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-white" />
        ) : (
          <Sun className="h-3 w-3 text-amber-500" />
        )}
      </div>
    </button>
  );
}
