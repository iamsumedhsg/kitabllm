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

  // Get a meaningful short label from the excerpt
  const shortExcerpt = citation.excerpt
    ? citation.excerpt.slice(0, 40) + (citation.excerpt.length > 40 ? "..." : "")
    : null;

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 hover:border-primary/40 transition-all group max-w-[250px]"
      title={citation.excerpt || "View source"}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {shortExcerpt ? (
        <span className="truncate text-left">&ldquo;{shortExcerpt}&rdquo;</span>
      ) : (
        <span className="truncate">{citation.source?.filename || "Source"}</span>
      )}
    </button>
  );
}
