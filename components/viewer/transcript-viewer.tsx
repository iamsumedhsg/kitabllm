"use client";

import { useState, useEffect, useRef } from "react";
import { AlignLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Source } from "@/types";

interface TranscriptViewerProps {
  source: Source;
  highlightChunkId?: string | null;
  excerpt?: string | null;
}

interface ChunkData {
  id: string;
  content: string;
  chunkNumber: number;
  timestamp: string | null;
}

export function TranscriptViewer({ source, highlightChunkId, excerpt }: TranscriptViewerProps) {
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Fetch all chunks for this source to display as full transcript
  useEffect(() => {
    async function fetchChunks() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sources/${source.id}`);
        if (!res.ok) return;
        const data = await res.json();
        // The source endpoint doesn't return chunks, we need a different approach
        // Fetch chunks via a dedicated endpoint or embed them in the source response
        const chunksRes = await fetch(`/api/sources/${source.id}/chunks`);
        if (chunksRes.ok) {
          const chunksData = await chunksRes.json();
          setChunks(chunksData.chunks || []);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchChunks();
  }, [source.id]);

  // Scroll to highlighted chunk
  useEffect(() => {
    if (highlightChunkId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightChunkId, chunks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Highlighted excerpt at top */}
      {excerpt && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <AlignLeft className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs font-medium text-primary">Cited Passage</p>
          </div>
          <p className="text-sm text-foreground bg-yellow-500/10 rounded px-2 py-1 border-l-2 border-yellow-500">
            {excerpt}
          </p>
        </div>
      )}

      {/* Full transcript with highlighted chunk */}
      <div className="space-y-2">
        {chunks.map((chunk) => {
          const isHighlighted = chunk.id === highlightChunkId;
          return (
            <div
              key={chunk.id}
              ref={isHighlighted ? highlightRef : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-all",
                isHighlighted
                  ? "bg-yellow-500/15 border border-yellow-500/40 ring-2 ring-yellow-500/20"
                  : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              {chunk.timestamp && (
                <span className="text-[10px] font-mono text-muted-foreground mr-2">
                  [{chunk.timestamp}]
                </span>
              )}
              <span className={cn(isHighlighted && "font-medium")}>
                {chunk.content}
              </span>
            </div>
          );
        })}

        {chunks.length === 0 && !excerpt && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No transcript content available
          </p>
        )}
      </div>
    </div>
  );
}
