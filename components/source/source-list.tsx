"use client";

import { useState } from "react";
import { SourceCard } from "./source-card";
import { SourceUploader } from "./source-uploader";
import { Plus, FileText } from "lucide-react";
import type { Source } from "@/types";

interface SourceListProps {
  notebookId: string;
  sources: Source[];
}

export function SourceList({ notebookId, sources }: SourceListProps) {
  const [showUploader, setShowUploader] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Sources</h3>
          <span className="text-xs text-muted-foreground">
            ({sources.length})
          </span>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="rounded-md p-1.5 hover:bg-accent transition-colors"
          title="Add source"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Source Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No sources yet</p>
            <button
              onClick={() => setShowUploader(true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Add your first source
            </button>
          </div>
        ) : (
          sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))
        )}
      </div>

      {/* Upload Dialog */}
      {showUploader && (
        <SourceUploader
          notebookId={notebookId}
          onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}
