"use client";

import type { Source } from "@/types";

interface YouTubeViewerProps {
  source: Source;
  timestamp?: string | null;
}

export function YouTubeViewer({ source, timestamp }: YouTubeViewerProps) {
  const metadata = source.metadata as { videoId?: string } | null;
  const videoId = metadata?.videoId;

  if (!videoId) {
    return (
      <p className="text-sm text-muted-foreground">
        YouTube video preview unavailable
      </p>
    );
  }

  // Convert timestamp to seconds for embed start
  let startSeconds = 0;
  if (timestamp) {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 3) {
      startSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      startSeconds = parts[0] * 60 + parts[1];
    }
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}${startSeconds ? `?start=${startSeconds}` : ""}`}
          className="w-full h-full"
          title={source.filename}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {timestamp && (
        <p className="text-xs text-muted-foreground">
          Jumping to timestamp: {timestamp}
        </p>
      )}
    </div>
  );
}
