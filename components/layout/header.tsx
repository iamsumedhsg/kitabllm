"use client";

import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 px-6 backdrop-blur-sm bg-background/60">
      {/* Left spacer */}
      <div className="w-24" />

      {/* Center logo */}
      <div className="flex items-center gap-2">
        <Image src="/book.svg" alt="KitabLLM" width={20} height={20} className="logo-themed" />
        <span className="text-sm font-semibold text-foreground">KitabLLM</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8 ring-2 ring-primary/10",
            },
          }}
        />
      </div>
    </header>
  );
}
