"use client";

import {
  FileText,
  Globe,
  Video,
  AlignLeft,
  Subtitles,
  MoreHorizontal,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useDeleteSource, useReindexSource } from "@/hooks/use-sources";
import { cn } from "@/lib/utils";
import type { Source, SourceType } from "@/types";

interface SourceCardProps {
  source: Source;
}

const typeIcons: Record<SourceType, React.ReactNode> = {
  PDF: <FileText className="h-4 w-4" />,
  WEBSITE: <Globe className="h-4 w-4" />,
  YOUTUBE: <Video className="h-4 w-4" />,
  TEXT: <AlignLeft className="h-4 w-4" />,
  VTT: <Subtitles className="h-4 w-4" />,
};

const statusColors = {
  UPLOADING: "bg-blue-500",
  INDEXING: "bg-yellow-500",
  READY: "bg-green-500",
  FAILED: "bg-red-500",
  REMOVING: "bg-orange-500",
};

export function SourceCard({ source }: SourceCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const deleteSource = useDeleteSource();
  const reindexSource = useReindexSource();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  return (
    <div className="group relative rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className="relative mt-0.5">
          <div className="rounded-md bg-muted p-1.5">
            {typeIcons[source.type]}
          </div>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
              statusColors[source.status]
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{source.filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {formatSize(source.size)}
            </span>
            <span className="text-xs text-muted-foreground">
              {source.status === "INDEXING" && "Indexing..."}
              {source.status === "FAILED" && "Failed"}
              {source.status === "UPLOADING" && "Uploading..."}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-popover p-1 shadow-lg z-10">
              <button
                onClick={() => {
                  reindexSource.mutate({
                    id: source.id,
                    notebookId: source.notebookId,
                  });
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
              >
                <RefreshCw className="h-3 w-3" />
                Re-index
              </button>
              <button
                onClick={() => {
                  deleteSource.mutate({
                    id: source.id,
                    notebookId: source.notebookId,
                  });
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
