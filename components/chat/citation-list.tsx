"use client";

import { CitationChip } from "./citation-chip";
import type { Citation } from "@/types";

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {citations.map((citation, i) => (
        <CitationChip key={citation.id} citation={citation} index={i} />
      ))}
    </div>
  );
}
