"use client";

import { X } from "lucide-react";
import { useViewerStore } from "@/store/viewer-store";
import { PDFViewer } from "./pdf-viewer";
import { WebsiteViewer } from "./website-viewer";
import { YouTubeViewer } from "./youtube-viewer";
import { TranscriptViewer } from "./transcript-viewer";

export function SourceViewer() {
  const { activeSource, activeCitation, closeViewer, highlightChunkId } =
    useViewerStore();

  if (!activeSource) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <h3 className="text-sm font-medium truncate">
            {activeSource.filename}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeSource.type}
          </p>
        </div>
        <button
          onClick={closeViewer}
          className="rounded-md p-1 hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSource.type === "PDF" && (
          <PDFViewer
            source={activeSource}
            pageNumber={activeCitation?.pageNumber}
          />
        )}
        {activeSource.type === "WEBSITE" && (
          <WebsiteViewer source={activeSource} />
        )}
        {activeSource.type === "YOUTUBE" && (
          <YouTubeViewer
            source={activeSource}
            timestamp={activeCitation?.timestamp}
          />
        )}
        {(activeSource.type === "VTT" || activeSource.type === "TEXT") && (
          <TranscriptViewer
            source={activeSource}
            highlightChunkId={highlightChunkId}
          />
        )}
      </div>
    </div>
  );
}
