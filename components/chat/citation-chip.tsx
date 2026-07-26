"use client";

import { FileText } from "lucide-react";
import { useViewerStore } from "@/store/viewer-store";
import type { Citation } from "@/types";

interface CitationChipProps {
  citation: Citation;
}

export function CitationChip({ citation }: CitationChipProps) {
  const openViewer = useViewerStore((s) => s.openViewer);

  const handleClick = () => {
    if (citation.source) {
      openViewer(citation.source, citation);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
    >
      <FileText className="h-3 w-3" />
      <span className="max-w-[100px] truncate">
        {citation.source?.filename || "Source"}
      </span>
      {citation.pageNumber && (
        <span className="text-primary/70">p.{citation.pageNumber}</span>
      )}
    </button>
  );
}
