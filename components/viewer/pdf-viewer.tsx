"use client";

import { FileText } from "lucide-react";
import type { Source } from "@/types";

interface PDFViewerProps {
  source: Source;
  pageNumber?: number | null;
}

export function PDFViewer({ source, pageNumber }: PDFViewerProps) {
  const pdfUrl = source.filePath
    ? `/api/sources/${source.id}/content`
    : null;

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">PDF preview unavailable</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe
        src={`${pdfUrl}${pageNumber ? `#page=${pageNumber}` : ""}`}
        className="w-full h-[600px] rounded-lg border border-border"
        title={source.filename}
      />
    </div>
  );
}
