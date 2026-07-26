"use client";

import { useState, useCallback } from "react";
import { useDebouncedCallback } from "@/lib/utils-hooks";

interface SearchResult {
  id: string;
  content: string;
  sourceId: string;
  sourceName: string;
  pageNumber: number | null;
  score: number;
}

export function useSearch(notebookId: string | null) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim() || !notebookId) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, notebookId }),
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [notebookId]
  );

  return { results, isSearching, search };
}
