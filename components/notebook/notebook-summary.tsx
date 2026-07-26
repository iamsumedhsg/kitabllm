"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, Sparkles, Loader2, X } from "lucide-react";

interface NotebookSummaryProps {
  notebookId: string;
  onClose: () => void;
}

export function NotebookSummary({ notebookId, onClose }: NotebookSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);

  const generateSummary = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notebooks/${notebookId}/summary`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate summary");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSummary(data.summary);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[80vh] rounded-xl border border-border bg-card shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Notebook Summary</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!summary && !generateSummary.isPending && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-10 w-10 text-primary/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Generate AI Summary
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Get an executive summary, key insights, flashcards, and quiz
                questions from your notebook sources.
              </p>
              <button
                onClick={() => generateSummary.mutate()}
                disabled={generateSummary.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Generate Summary
              </button>
            </div>
          )}

          {generateSummary.isPending && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing your sources and generating summary...
              </p>
            </div>
          )}

          {generateSummary.isError && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive mb-4">
                {generateSummary.error.message}
              </p>
              <button
                onClick={() => generateSummary.mutate()}
                className="text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {summary && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{summary}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
