"use client";

import { FileText, Video, Globe, AlignLeft, Subtitles } from "lucide-react";
import { useViewerStore } from "@/store/viewer-store";
import type { Citation, SourceType } from "@/types";

interface CitationChipProps {
  citation: Citation;
  index: number;
}

const typeIcons: Record<SourceType, typeof FileText> = {
  PDF: FileText,
  YOUTUBE: Video,
  WEBSITE: Globe,
  TEXT: AlignLeft,
  VTT: Subtitles,
};

export function CitationChip({ citation, index }: CitationChipProps) {
  const openViewer = useViewerStore((s) => s.openViewer);

  const handleClick = () => {
    if (citation.source) {
      openViewer(citation.source, citation);
    }
  };

  const sourceType = citation.source?.type || "TEXT";
  const Icon = typeIcons[sourceType as SourceType] || FileText;

  // Build the label showing what you'll jump to
  let jumpLabel = "";
  if (citation.timestamp) {
    // Extract start time from range like "3:01-3:45"
    const startTime = citation.timestamp.split("-")[0];
    jumpLabel = startTime;
  } else if (citation.pageNumber) {
    jumpLabel = `p.${citation.pageNumber}`;
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 hover:border-primary/40 transition-all group"
      title={citation.excerpt || "View source"}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="max-w-[80px] truncate">
        {citation.source?.filename || "Source"}
      </span>
      {jumpLabel && (
        <span className="text-[10px] bg-primary/20 rounded px-1 py-0.5 font-mono group-hover:bg-primary/30">
          {jumpLabel}
        </span>
      )}
      <span className="text-[10px] text-primary/60 font-mono">
        [{index + 1}]
      </span>
    </button>
  );
}
