"use client";

import { FileText, BookOpen } from "lucide-react";
import type { Source } from "@/types";

interface PDFViewerProps {
  source: Source;
  pageNumber?: number | null;
  excerpt?: string | null;
}

export function PDFViewer({ source, pageNumber, excerpt }: PDFViewerProps) {
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
    <div className="space-y-3">
      {/* Evidence indicator */}
      {(pageNumber || excerpt) && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs font-medium text-primary">
              {pageNumber ? `Page ${pageNumber}` : "Source Evidence"}
            </p>
          </div>
          {excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-3 italic border-l-2 border-primary/30 pl-2 mt-1">
              &ldquo;{excerpt}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* PDF embed */}
      <iframe
        src={`${pdfUrl}${pageNumber ? `#page=${pageNumber}` : ""}`}
        className="w-full h-[550px] rounded-lg border border-border"
        title={source.filename}
      />
    </div>
  );
}
