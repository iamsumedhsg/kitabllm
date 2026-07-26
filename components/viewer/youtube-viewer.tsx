"use client";

import { useState, useEffect } from "react";
import { Play, Clock } from "lucide-react";
import type { Source } from "@/types";

interface YouTubeViewerProps {
  source: Source;
  timestamp?: string | null;
  excerpt?: string | null;
}

/**
 * Parse timestamp string (M:SS, MM:SS, H:MM:SS) to seconds
 */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function YouTubeViewer({ source, timestamp, excerpt }: YouTubeViewerProps) {
  const metadata = source.metadata as { videoId?: string } | null;
  const videoId = metadata?.videoId;
  const [startSeconds, setStartSeconds] = useState(0);

  useEffect(() => {
    if (timestamp) {
      // Timestamp can be a range like "3:01-3:45" — take the start
      const startPart = timestamp.split("-")[0];
      setStartSeconds(parseTimestamp(startPart));
    }
  }, [timestamp]);

  if (!videoId) {
    return (
      <p className="text-sm text-muted-foreground">
        YouTube video preview unavailable
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video embed */}
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
        <iframe
          key={`${videoId}-${startSeconds}`}
          src={`https://www.youtube.com/embed/${videoId}?start=${startSeconds}&autoplay=1`}
          className="w-full h-full"
          title={source.filename}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Jump indicator */}
      {timestamp && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary">
              Jumping to {timestamp}
            </p>
            {excerpt && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 italic">
                &ldquo;{excerpt}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
