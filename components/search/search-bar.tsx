"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search everything..."
        className="w-full rounded-lg border border-border bg-background/50 py-2 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
      />
    </div>
  );
}
