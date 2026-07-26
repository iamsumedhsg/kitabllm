"use client";

import { useState } from "react";
import { FileText, BookOpen, AlertCircle } from "lucide-react";
import type { Source } from "@/types";

interface PDFViewerProps {
  source: Source;
  pageNumber?: number | null;
  excerpt?: string | null;
}

export function PDFViewer({ source, pageNumber, excerpt }: PDFViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const pdfUrl = source.filePath
    ? `/api/sources/${source.id}/content`
    : null;

  if (!pdfUrl || loadError) {
    return (
      <div className="space-y-3">
        {/* Still show the evidence even if PDF can't load */}
        {excerpt && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs font-medium text-primary">
                {pageNumber ? `Page ${pageNumber}` : "Source Evidence"}
              </p>
            </div>
            <p className="text-sm text-foreground bg-yellow-500/10 rounded px-2 py-1 border-l-2 border-yellow-500 mt-1">
              {excerpt}
            </p>
          </div>
        )}
        <div className="flex flex-col items-center justify-center h-48 text-center rounded-lg border border-border bg-muted/30">
          <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">PDF preview unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">File not accessible on this server</p>
        </div>
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
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
