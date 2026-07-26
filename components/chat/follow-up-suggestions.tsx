"use client";

import { useState, useEffect, useRef } from "react";
import { Lightbulb } from "lucide-react";

interface FollowUpSuggestionsProps {
  notebookId: string;
  lastMessage: string;
  lastResponse: string;
  onSelect: (question: string) => void;
  show: boolean;
}

export function FollowUpSuggestions({
  notebookId,
  lastMessage,
  lastResponse,
  onSelect,
  show,
}: FollowUpSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!show || !lastMessage || !lastResponse || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/chat/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notebookId,
            lastMessage,
            lastResponse: lastResponse.slice(0, 2000),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data.suggestions || []).slice(0, 3));
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [show, lastMessage, lastResponse, notebookId]);

  if (!show || isLoading || suggestions.length === 0) return null;

  return (
    <div className="flex items-start gap-2 pt-2">
      <Lightbulb className="h-3.5 w-3.5 text-muted-foreground mt-1.5 flex-shrink-0" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSelect(suggestion)}
            className="flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground hover:border-ring/30 transition-all whitespace-nowrap"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
