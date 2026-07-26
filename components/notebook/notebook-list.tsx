"use client";

import Link from "next/link";
import { NotebookCard } from "./notebook-card";
import { CreateNotebookDialog } from "./create-notebook-dialog";
import { Plus } from "lucide-react";
import type { Notebook } from "@/types";

interface NotebookListProps {
  notebooks: Notebook[];
}

export function NotebookList({ notebooks }: NotebookListProps) {
  if (notebooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No notebooks yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first notebook to get started
        </p>
        <CreateNotebookDialog>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" />
            Create Notebook
          </button>
        </CreateNotebookDialog>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notebooks.map((notebook) => (
        <Link key={notebook.id} href={`/notebook/${notebook.id}`}>
          <NotebookCard notebook={notebook} />
        </Link>
      ))}
    </div>
  );
}
