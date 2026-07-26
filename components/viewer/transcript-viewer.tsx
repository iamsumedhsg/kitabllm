"use client";

import { cn } from "@/lib/utils";
import type { Source } from "@/types";

interface TranscriptViewerProps {
  source: Source;
  highlightChunkId?: string | null;
}

export function TranscriptViewer({ source, highlightChunkId }: TranscriptViewerProps) {
  // For now, show a placeholder - content will be fetched from the API
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Content viewer for {source.type} source: {source.filename}
        </p>
        {highlightChunkId && (
          <p className="text-xs text-primary mt-2">
            Highlighting chunk: {highlightChunkId}
          </p>
        )}
      </div>
    </div>
  );
}
