"use client";

import { BookOpen, FileText, MessageSquare, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useDeleteNotebook } from "@/hooks/use-notebooks";
import { useState } from "react";
import type { Notebook } from "@/types";

interface NotebookCardProps {
  notebook: Notebook;
}

export function NotebookCard({ notebook }: NotebookCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const deleteNotebook = useDeleteNotebook();

  const timeAgo = getTimeAgo(new Date(notebook.updatedAt));

  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-ring/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground line-clamp-1">
              {notebook.title}
            </h3>
            {notebook.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {notebook.description}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg z-10">
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteNotebook.mutate(notebook.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {notebook._count?.sources || 0} sources
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {notebook._count?.conversations || 0} chats
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Updated {timeAgo}
      </p>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
