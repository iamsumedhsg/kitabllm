"use client";

import { useState } from "react";
import { Search, FileText, Loader2, X } from "lucide-react";
import { useViewerStore } from "@/store/viewer-store";

interface SemanticResult {
  id: string;
  content: string;
  sourceId: string;
  sourceName: string;
  pageNumber: number | null;
  score: number;
}

interface SemanticSearchProps {
  notebookId: string;
  onClose: () => void;
}

export function SemanticSearch({ notebookId, onClose }: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, notebookId }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your notebook semantically..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-4 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {result.sourceName}
                  </span>
                  {result.pageNumber && (
                    <span className="text-xs text-muted-foreground">
                      p.{result.pageNumber}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {(result.score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-sm line-clamp-3">{result.content}</p>
              </div>
            ))}
          </div>
        )}

        {query && results.length === 0 && !isSearching && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No results found. Try different search terms.
            </p>
          </div>
        )}

        {!query && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Search semantically across all your notebook sources
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
