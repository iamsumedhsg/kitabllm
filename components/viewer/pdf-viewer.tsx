"use client";

import { useState, useEffect } from "react";
import { FileText, BookOpen, AlertCircle } from "lucide-react";
import type { Source } from "@/types";

interface PDFViewerProps {
  source: Source;
  pageNumber?: number | null;
  excerpt?: string | null;
}

export function PDFViewer({ source, pageNumber, excerpt }: PDFViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const [checking, setChecking] = useState(true);
  const pdfUrl = source.filePath
    ? `/api/sources/${source.id}/content`
    : null;

  // Pre-check if the file is available before rendering the iframe
  useEffect(() => {
    if (!pdfUrl) {
      setLoadError(true);
      setChecking(false);
      return;
    }

    fetch(pdfUrl, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setChecking(false));
  }, [pdfUrl]);

  if (checking) {
    return (
      <div className="space-y-3">
        {excerpt && (
          <EvidenceBox pageNumber={pageNumber} excerpt={excerpt} />
        )}
        <div className="flex items-center justify-center h-48">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        {excerpt && (
          <EvidenceBox pageNumber={pageNumber} excerpt={excerpt} />
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
      {(pageNumber || excerpt) && (
        <EvidenceBox pageNumber={pageNumber} excerpt={excerpt} />
      )}
      <iframe
        src={`${pdfUrl}${pageNumber ? `#page=${pageNumber}` : ""}`}
        className="w-full h-[550px] rounded-lg border border-border"
        title={source.filename}
      />
    </div>
  );
}

function EvidenceBox({ pageNumber, excerpt }: { pageNumber?: number | null; excerpt?: string | null }) {
  return (
    <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-xs font-medium text-primary">
          {pageNumber ? `Page ${pageNumber}` : "Source Evidence"}
        </p>
      </div>
      {excerpt && (
        <p className="text-sm text-foreground bg-yellow-500/10 rounded px-2 py-1 border-l-2 border-yellow-500 mt-1">
          {excerpt}
        </p>
      )}
    </div>
  );
}
