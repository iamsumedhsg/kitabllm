"use client";

import { Globe, ExternalLink } from "lucide-react";
import type { Source } from "@/types";

interface WebsiteViewerProps {
  source: Source;
}

export function WebsiteViewer({ source }: WebsiteViewerProps) {
  const url = source.url;

  return (
    <div className="space-y-4">
      {url && (
        <div className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate flex items-center gap-1"
          >
            {url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      {url ? (
        <iframe
          src={url}
          className="w-full h-[500px] rounded-lg border border-border"
          title={source.filename}
          sandbox="allow-same-origin"
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Website preview unavailable
        </p>
      )}
    </div>
  );
}
