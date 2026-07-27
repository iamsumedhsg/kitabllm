"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, BookOpen, MessageSquare } from "lucide-react";
import { useNotebooks } from "@/hooks/use-notebooks";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "notebook" | "source" | "chunk";
  title: string;
  subtitle: string;
  notebookId?: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: notebooks } = useNotebooks();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Local filtering of notebooks
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    const notebookResults: SearchResult[] = (notebooks || [])
      .filter(
        (n) =>
          n.title.toLowerCase().includes(searchTerm) ||
          n.description?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5)
      .map((n) => ({
        id: n.id,
        type: "notebook" as const,
        title: n.title,
        subtitle: n.description || "Notebook",
        notebookId: n.id,
      }));

    setResults(notebookResults);
  }, [query, notebooks]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    if (result.type === "notebook") {
      router.push(`/notebook/${result.id}`);
    } else if (result.notebookId) {
      router.push(`/notebook/${result.notebookId}`);
    }
  };

  const typeIcons = {
    notebook: BookOpen,
    source: FileText,
    chunk: MessageSquare,
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search notebooks..."
          className="w-full clay-input py-2 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {results.map((result) => {
              const Icon = typeIcons[result.type];
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {result.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg z-50 p-4 text-center">
          <p className="text-sm text-muted-foreground">No results found</p>
        </div>
      )}
    </div>
  );
}
