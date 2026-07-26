"use client";

import { useState, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    if (!show || !lastMessage || !lastResponse) return;

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
          setSuggestions(data.suggestions || []);
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="max-w-3xl mx-auto w-full"
      >
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            Follow-up questions
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSelect(suggestion)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground hover:border-ring/30 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
