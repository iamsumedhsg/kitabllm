"use client";

import { use } from "react";
import { useNotebook } from "@/hooks/use-notebooks";
import { useSources } from "@/hooks/use-sources";
import { ChatWindow } from "@/components/chat/chat-window";
import { SourceList } from "@/components/source/source-list";
import { SourceViewer } from "@/components/viewer/source-viewer";
import { useViewerStore } from "@/store/viewer-store";

export default function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: notebook } = useNotebook(id);
  const { data: sources } = useSources(id);
  const isViewerOpen = useViewerStore((s) => s.isOpen);

  if (!notebook) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
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
  );
}
