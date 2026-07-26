"use client";

import { use, useState } from "react";
import { useNotebook } from "@/hooks/use-notebooks";
import { useSources } from "@/hooks/use-sources";
import { ChatWindow } from "@/components/chat/chat-window";
import { SourceList } from "@/components/source/source-list";
import { SourceViewer } from "@/components/viewer/source-viewer";
import { NotebookDashboard } from "@/components/notebook/notebook-dashboard";
import { NotebookSummary } from "@/components/notebook/notebook-summary";
import { SemanticSearch } from "@/components/search/semantic-search";
import { useViewerStore } from "@/store/viewer-store";
import { BookOpen, BarChart3, Sparkles, Search } from "lucide-react";

export default function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: notebook } = useNotebook(id);
  const { data: sources } = useSources(id);
  const isViewerOpen = useViewerStore((s) => s.isOpen);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  if (!notebook) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Notebook Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">{notebook.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Stats
          </button>
          <button
            onClick={() => setShowSummary(true)}
            className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Summary
          </button>
        </div>
      </div>

      {/* Dashboard (collapsible) */}
      {showDashboard && <NotebookDashboard notebookId={id} />}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sources Panel */}
        <div className="w-72 border-r border-border flex-shrink-0 overflow-y-auto">
          <SourceList notebookId={id} sources={sources || []} />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow notebookId={id} notebookTitle={notebook.title} />
        </div>

        {/* Source Viewer (conditional) */}
        {isViewerOpen && (
          <div className="w-[450px] border-l border-border flex-shrink-0 overflow-hidden">
            <SourceViewer />
          </div>
        )}
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <NotebookSummary
          notebookId={id}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Semantic Search Modal */}
      {showSearch && (
        <SemanticSearch
          notebookId={id}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
