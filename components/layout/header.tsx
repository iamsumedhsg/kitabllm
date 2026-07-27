"use client";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-end border-b border-border/50 px-6 backdrop-blur-sm bg-background/60">
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
